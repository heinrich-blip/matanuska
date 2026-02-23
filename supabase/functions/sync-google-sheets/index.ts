// Trip & Diesel Reports - Google Sheets Sync
// Pushes trip report and diesel consumption data to Google Sheets on a schedule

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Sheets API helper
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson)

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  // Create JWT claims
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Base64url encode
  const base64url = (obj: object) => {
    const json = JSON.stringify(obj)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const unsignedToken = `${base64url(header)}.${base64url(claims)}`

  // Sign with private key
  const privateKey = serviceAccount.private_key
  const encoder = new TextEncoder()
  const data = encoder.encode(unsignedToken)

  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKey.substring(
    privateKey.indexOf(pemHeader) + pemHeader.length,
    privateKey.indexOf(pemFooter)
  ).replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data)
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${unsignedToken}.${signatureBase64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// Update Google Sheet
async function updateSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  data: any[][]
): Promise<void> {
  // Clear existing data
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  // Write new data
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: sheetName,
        majorDimension: 'ROWS',
        values: data,
      }),
    }
  )
}

// Sync Diesel Reports to Google Sheets
async function syncDieselReports(
  supabase: any,
  accessToken: string,
  spreadsheetId: string,
  startDate: Date | null,
  period: string
): Promise<Response> {
  // Fetch diesel records
  let dieselQuery = supabase
    .from('diesel_records')
    .select('*')
    .order('date', { ascending: false })

  if (startDate) {
    dieselQuery = dieselQuery.gte('date', startDate.toISOString().split('T')[0])
  }

  const { data: dieselRecords, error: dieselError } = await dieselQuery
  if (dieselError) throw new Error(`Failed to fetch diesel records: ${dieselError.message}`)

  // Fetch diesel norms
  const { data: dieselNorms } = await supabase
    .from('diesel_norms')
    .select('*')
    .order('fleet_number')

  const normsMap = new Map((dieselNorms || []).map((n: any) => [n.fleet_number, n]))

  // Build aggregated data
  const fleetMap = new Map<string, any>()
  const driverMap = new Map<string, any>()
  const stationMap = new Map<string, any>()
  const weeklyMap = new Map<string, any>()
  const monthlyMap = new Map<string, any>()

  let totalLitres = 0
  let totalCostZAR = 0
  let totalCostUSD = 0
  let totalKm = 0
  let totalPendingDebriefs = 0
  let totalCompletedDebriefs = 0

  const records = dieselRecords || []

  records.forEach((record: any) => {
    const litres = record.litres_filled || 0
    const cost = record.total_cost || 0
    const km = record.distance_travelled || 0
    const currency = record.currency || 'ZAR'
    const fleetNumber = (record.fleet_number || '').toUpperCase().trim()
    const driverName = record.driver_name || 'Unknown'
    const station = record.fuel_station || 'Unknown'
    const kmPerLitre = record.km_per_litre || (litres > 0 && km > 0 ? km / litres : null)

    // Check if debrief required
    const norm = normsMap.get(fleetNumber)
    const requiresDebrief = kmPerLitre !== null && norm && kmPerLitre < norm.min_acceptable

    if (requiresDebrief && !record.debrief_signed) totalPendingDebriefs++
    if (record.debrief_signed) totalCompletedDebriefs++

    // Overall totals
    totalLitres += litres
    if (currency === 'USD') totalCostUSD += cost
    else totalCostZAR += cost
    totalKm += km

    // Fleet summary
    if (fleetNumber) {
      const fleet = fleetMap.get(fleetNumber) || {
        fills: 0, litres: 0, km: 0, cost_zar: 0, cost_usd: 0, pending_debriefs: 0
      }
      fleet.fills += 1
      fleet.litres += litres
      fleet.km += km
      if (currency === 'USD') fleet.cost_usd += cost
      else fleet.cost_zar += cost
      if (requiresDebrief && !record.debrief_signed) fleet.pending_debriefs++
      fleetMap.set(fleetNumber, fleet)
    }

    // Driver summary
    const driver = driverMap.get(driverName) || {
      fills: 0, litres: 0, km: 0, cost_zar: 0, cost_usd: 0, fleets: new Set()
    }
    driver.fills += 1
    driver.litres += litres
    driver.km += km
    if (currency === 'USD') driver.cost_usd += cost
    else driver.cost_zar += cost
    if (fleetNumber) driver.fleets.add(fleetNumber)
    driverMap.set(driverName, driver)

    // Station summary
    const stationData = stationMap.get(station) || {
      fills: 0, litres: 0, cost_zar: 0, cost_usd: 0, fleets: new Set()
    }
    stationData.fills += 1
    stationData.litres += litres
    if (currency === 'USD') stationData.cost_usd += cost
    else stationData.cost_zar += cost
    if (fleetNumber) stationData.fleets.add(fleetNumber)
    stationMap.set(station, stationData)

    // Weekly summary
    if (record.date) {
      const date = new Date(record.date)
      const weekNum = getISOWeek(date)
      const year = getISOWeekYear(date)
      const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`

      const week = weeklyMap.get(weekKey) || {
        week: weekNum, year, fills: 0, litres: 0, km: 0, cost_zar: 0, cost_usd: 0
      }
      week.fills += 1
      week.litres += litres
      week.km += km
      if (currency === 'USD') week.cost_usd += cost
      else week.cost_zar += cost
      weeklyMap.set(weekKey, week)

      // Monthly summary
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const month = monthlyMap.get(monthKey) || {
        month: monthNames[date.getMonth()], year: date.getFullYear(), fills: 0, litres: 0, km: 0, cost_zar: 0, cost_usd: 0
      }
      month.fills += 1
      month.litres += litres
      month.km += km
      if (currency === 'USD') month.cost_usd += cost
      else month.cost_zar += cost
      monthlyMap.set(monthKey, month)
    }
  })

  // Prepare sheet data

  // Diesel Summary sheet
  const avgKmPerLitre = totalLitres > 0 ? (totalKm / totalLitres).toFixed(2) : '0'
  const avgCostPerLitreZAR = totalLitres > 0 && totalCostZAR > 0 ? (totalCostZAR / totalLitres).toFixed(2) : 'N/A'

  const summaryData = [
    ['Diesel Consumption Report'],
    ['Period', period],
    ['Generated', new Date().toISOString()],
    [''],
    ['Overall Statistics'],
    ['Total Records', records.length],
    ['Total Litres Filled', totalLitres.toFixed(2)],
    ['Total Distance (km)', totalKm.toFixed(0)],
    ['Average km/L', avgKmPerLitre],
    [''],
    ['Financial Summary'],
    ['Total Cost (ZAR)', totalCostZAR.toFixed(2)],
    ['Total Cost (USD)', totalCostUSD.toFixed(2)],
    ['Avg Cost/Litre (ZAR)', avgCostPerLitreZAR],
    [''],
    ['Debrief Status'],
    ['Pending Debriefs', totalPendingDebriefs],
    ['Completed Debriefs', totalCompletedDebriefs],
    [''],
    ['Unique Trucks', fleetMap.size],
    ['Unique Drivers', driverMap.size],
    ['Unique Stations', stationMap.size],
  ]

  // Diesel by Fleet sheet
  const fleetData = [
    ['Fleet', 'Fill Count', 'Litres', 'Distance (km)', 'km/L', 'Cost (ZAR)', 'Cost (USD)', 'Pending Debriefs'],
    ...Array.from(fleetMap.entries())
      .sort((a, b) => b[1].litres - a[1].litres)
      .map(([fleet, d]) => [
        fleet,
        d.fills,
        d.litres.toFixed(2),
        d.km.toFixed(0),
        d.litres > 0 ? (d.km / d.litres).toFixed(2) : 'N/A',
        d.cost_zar.toFixed(2),
        d.cost_usd.toFixed(2),
        d.pending_debriefs
      ])
  ]

  // Diesel by Driver sheet
  const driverData = [
    ['Driver', 'Fill Count', 'Litres', 'Distance (km)', 'km/L', 'Cost (ZAR)', 'Cost (USD)', 'Fleets Used'],
    ...Array.from(driverMap.entries())
      .sort((a, b) => b[1].litres - a[1].litres)
      .map(([driver, d]) => [
        driver,
        d.fills,
        d.litres.toFixed(2),
        d.km.toFixed(0),
        d.litres > 0 ? (d.km / d.litres).toFixed(2) : 'N/A',
        d.cost_zar.toFixed(2),
        d.cost_usd.toFixed(2),
        Array.from(d.fleets).join(', ')
      ])
  ]

  // Diesel by Station sheet
  const stationData = [
    ['Station', 'Fill Count', 'Litres', 'Cost (ZAR)', 'Cost (USD)', 'Avg Cost/L (ZAR)', 'Fleets Served'],
    ...Array.from(stationMap.entries())
      .sort((a, b) => b[1].litres - a[1].litres)
      .map(([station, d]) => [
        station,
        d.fills,
        d.litres.toFixed(2),
        d.cost_zar.toFixed(2),
        d.cost_usd.toFixed(2),
        d.litres > 0 && d.cost_zar > 0 ? (d.cost_zar / d.litres).toFixed(2) : 'N/A',
        Array.from(d.fleets).join(', ')
      ])
  ]

  // Diesel Weekly sheet
  const weeklyData = [
    ['Week', 'Year', 'Fill Count', 'Litres', 'Distance (km)', 'km/L', 'Cost (ZAR)', 'Cost (USD)'],
    ...Array.from(weeklyMap.values())
      .sort((a, b) => `${b.year}-${b.week}`.localeCompare(`${a.year}-${a.week}`))
      .map(d => [
        d.week,
        d.year,
        d.fills,
        d.litres.toFixed(2),
        d.km.toFixed(0),
        d.litres > 0 ? (d.km / d.litres).toFixed(2) : 'N/A',
        d.cost_zar.toFixed(2),
        d.cost_usd.toFixed(2)
      ])
  ]

  // Diesel Monthly sheet
  const monthlyData = [
    ['Month', 'Year', 'Fill Count', 'Litres', 'Distance (km)', 'km/L', 'Cost (ZAR)', 'Cost (USD)'],
    ...Array.from(monthlyMap.values())
      .sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))
      .map(d => [
        d.month,
        d.year,
        d.fills,
        d.litres.toFixed(2),
        d.km.toFixed(0),
        d.litres > 0 ? (d.km / d.litres).toFixed(2) : 'N/A',
        d.cost_zar.toFixed(2),
        d.cost_usd.toFixed(2)
      ])
  ]

  // Diesel Transactions (raw data) sheet
  const transactionsData = [
    ['Date', 'Fleet', 'Driver', 'Station', 'Litres', 'Cost', 'Currency', 'KM Reading', 'Distance', 'km/L', 'Debrief Status'],
    ...records.slice(0, 1000).map((r: any) => [
      r.date,
      r.fleet_number,
      r.driver_name || '',
      r.fuel_station,
      r.litres_filled,
      r.total_cost,
      r.currency || 'ZAR',
      r.km_reading,
      r.distance_travelled || '',
      r.km_per_litre ? r.km_per_litre.toFixed(2) : '',
      r.debrief_signed ? 'Completed' : (r.requires_debrief ? 'Pending' : 'N/A')
    ])
  ]

  // Update each diesel sheet
  await updateSheet(accessToken, spreadsheetId, 'Diesel Summary', summaryData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel by Fleet', fleetData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel by Driver', driverData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel by Station', stationData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel Weekly', weeklyData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel Monthly', monthlyData)
  await updateSheet(accessToken, spreadsheetId, 'Diesel Transactions', transactionsData)

  return new Response(JSON.stringify({
    success: true,
    message: 'Diesel reports synced to Google Sheet successfully',
    updated_at: new Date().toISOString(),
    period: period,
    records_processed: records.length,
    sheets_updated: ['Diesel Summary', 'Diesel by Fleet', 'Diesel by Driver', 'Diesel by Station', 'Diesel Weekly', 'Diesel Monthly', 'Diesel Transactions'],
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get config from environment
    const spreadsheetId = Deno.env.get('GOOGLE_SHEET_ID')
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')

    if (!spreadsheetId || !serviceAccountJson) {
      throw new Error('Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON environment variables')
    }

    // Get period and type from query params
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'ytd'
    const syncType = url.searchParams.get('type') || 'trips' // 'trips' or 'diesel'

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate date filter
    const now = new Date()
    let startDate: Date | null = null

    switch (period) {
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        break
      case '1year':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
      default:
        startDate = null
    }

    // Get Google access token
    const accessToken = await getGoogleAccessToken(serviceAccountJson)

    // Handle Diesel Reports sync
    if (syncType === 'diesel') {
      return await syncDieselReports(supabase, accessToken, spreadsheetId, startDate, period)
    }

    // Default: Handle Trip Reports sync
    // Fetch trips
    let tripsQuery = supabase
      .from('trips')
      .select(`
        id,
        trip_number,
        driver_name,
        client_name,
        base_revenue,
        revenue_currency,
        distance_km,
        departure_date,
        arrival_date,
        status,
        origin,
        destination,
        wialon_vehicles:vehicle_id(fleet_number),
        vehicles:fleet_vehicle_id(fleet_number)
      `)
      .order('departure_date', { ascending: false })

    if (startDate) {
      tripsQuery = tripsQuery.gte('departure_date', startDate.toISOString().split('T')[0])
    }

    const { data: tripsRaw, error: tripsError } = await tripsQuery
    if (tripsError) throw new Error(`Failed to fetch trips: ${tripsError.message}`)

    const trips = (tripsRaw || []).map((trip: any) => ({
      ...trip,
      fleet_number: trip.vehicles?.fleet_number || trip.wialon_vehicles?.fleet_number || null,
    }))

    // Fetch cost entries
    const tripIds = trips.map((t: any) => t.id)
    let costEntries: any[] = []

    if (tripIds.length > 0) {
      const { data: costs } = await supabase
        .from('cost_entries')
        .select('id, trip_id, amount, currency')
        .in('trip_id', tripIds)
      costEntries = costs || []
    }

    // Helper: Get costs by trip
    const getTripCosts = (tripId: string) => {
      const tripCosts = costEntries.filter((c: any) => c.trip_id === tripId)
      return {
        ZAR: tripCosts.filter((c: any) => (c.currency || 'ZAR') === 'ZAR').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
        USD: tripCosts.filter((c: any) => c.currency === 'USD').reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
      }
    }

    // Build report data
    const clientMap = new Map<string, any>()
    const driverMap = new Map<string, any>()
    const truckMap = new Map<string, any>()
    const weeklyMap = new Map<string, any>()
    const monthlyMap = new Map<string, any>()

    let totalRevenueZAR = 0, totalRevenueUSD = 0
    let totalExpensesZAR = 0, totalExpensesUSD = 0
    let totalKm = 0

    trips.forEach((trip: any) => {
      const costs = getTripCosts(trip.id)
      const currency = (trip.revenue_currency || 'ZAR') as 'ZAR' | 'USD'
      const revenue = trip.base_revenue || 0
      const km = trip.distance_km || 0

      // Overall totals
      if (currency === 'ZAR') totalRevenueZAR += revenue
      else totalRevenueUSD += revenue
      totalExpensesZAR += costs.ZAR
      totalExpensesUSD += costs.USD
      totalKm += km

      // Client summary
      const clientName = trip.client_name || 'No Client'
      const client = clientMap.get(clientName) || { trips: 0, revenue_zar: 0, revenue_usd: 0, expenses_zar: 0, expenses_usd: 0 }
      client.trips += 1
      if (currency === 'ZAR') client.revenue_zar += revenue; else client.revenue_usd += revenue
      client.expenses_zar += costs.ZAR
      client.expenses_usd += costs.USD
      clientMap.set(clientName, client)

      // Driver summary
      const driverName = trip.driver_name || 'Unassigned'
      const driver = driverMap.get(driverName) || { trips: 0, km: 0, revenue_zar: 0, revenue_usd: 0, expenses_zar: 0, expenses_usd: 0 }
      driver.trips += 1
      driver.km += km
      if (currency === 'ZAR') driver.revenue_zar += revenue; else driver.revenue_usd += revenue
      driver.expenses_zar += costs.ZAR
      driver.expenses_usd += costs.USD
      driverMap.set(driverName, driver)

      // Truck summary - grouped by fleet number only
      const fleetNumber = (trip.fleet_number || '').toUpperCase().trim()
      if (fleetNumber) {
        const truck = truckMap.get(fleetNumber) || { trips: 0, km: 0, revenue_zar: 0, revenue_usd: 0, expenses_zar: 0, expenses_usd: 0 }
        truck.trips += 1
        truck.km += km
        if (currency === 'ZAR') truck.revenue_zar += revenue; else truck.revenue_usd += revenue
        truck.expenses_zar += costs.ZAR
        truck.expenses_usd += costs.USD
        truckMap.set(fleetNumber, truck)
      }

      // Weekly summary
      const dateStr = trip.arrival_date || trip.departure_date
      if (dateStr) {
        const date = new Date(dateStr)
        const weekNum = getISOWeek(date)
        const year = getISOWeekYear(date)
        const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`
        const week = weeklyMap.get(weekKey) || { week: weekNum, year, trips: 0, km: 0, revenue_zar: 0, revenue_usd: 0, expenses_zar: 0, expenses_usd: 0 }
        week.trips += 1
        week.km += km
        if (currency === 'ZAR') week.revenue_zar += revenue; else week.revenue_usd += revenue
        week.expenses_zar += costs.ZAR
        week.expenses_usd += costs.USD
        weeklyMap.set(weekKey, week)

        // Monthly summary
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const month = monthlyMap.get(monthKey) || { month: monthNames[date.getMonth()], year: date.getFullYear(), trips: 0, km: 0, revenue_zar: 0, revenue_usd: 0, expenses_zar: 0, expenses_usd: 0 }
        month.trips += 1
        month.km += km
        if (currency === 'ZAR') month.revenue_zar += revenue; else month.revenue_usd += revenue
        month.expenses_zar += costs.ZAR
        month.expenses_usd += costs.USD
        monthlyMap.set(monthKey, month)
      }
    })

    // Prepare sheet data with headers matching your requested format

    // Summary sheet
    const marginZAR = totalRevenueZAR > 0 ? ((totalRevenueZAR - totalExpensesZAR) / totalRevenueZAR * 100).toFixed(2) + '%' : '0%'
    const marginUSD = totalRevenueUSD > 0 ? ((totalRevenueUSD - totalExpensesUSD) / totalRevenueUSD * 100).toFixed(2) + '%' : '0%'

    const summaryData = [
      ['Trip Reports Summary'],
      ['Period', period],
      ['Generated', new Date().toISOString()],
      [''],
      ['Overall Statistics'],
      ['Total Trips', trips.length],
      ['Total Kilometers', totalKm],
      [''],
      ['Financial Summary (ZAR)'],
      ['Revenue (ZAR)', totalRevenueZAR],
      ['Expenses (ZAR)', totalExpensesZAR],
      ['Net Profit (ZAR)', totalRevenueZAR - totalExpensesZAR],
      ['Profit Margin (ZAR)', marginZAR],
      [''],
      ['Financial Summary (USD)'],
      ['Revenue (USD)', totalRevenueUSD],
      ['Expenses (USD)', totalExpensesUSD],
      ['Net Profit (USD)', totalRevenueUSD - totalExpensesUSD],
      ['Profit Margin (USD)', marginUSD],
    ]

    // Client sheet: Client, Trips, Revenue (ZAR), Revenue (USD), Expenses (ZAR), Expenses (USD), Profit (ZAR), Profit (USD)
    const clientData = [
      ['Client', 'Trips', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
      ...Array.from(clientMap.entries())
        .sort((a, b) => (b[1].revenue_zar + b[1].revenue_usd) - (a[1].revenue_zar + a[1].revenue_usd))
        .map(([name, d]) => [name, d.trips, d.revenue_zar, d.revenue_usd, d.expenses_zar, d.expenses_usd, d.revenue_zar - d.expenses_zar, d.revenue_usd - d.expenses_usd])
    ]

    // Driver sheet: Driver, Trips, KM, Revenue (ZAR), Revenue (USD), Expenses (ZAR), Expenses (USD), Profit (ZAR), Profit (USD)
    const driverData = [
      ['Driver', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
      ...Array.from(driverMap.entries())
        .sort((a, b) => (b[1].revenue_zar + b[1].revenue_usd) - (a[1].revenue_zar + a[1].revenue_usd))
        .map(([name, d]) => [name, d.trips, d.km, d.revenue_zar, d.revenue_usd, d.expenses_zar, d.expenses_usd, d.revenue_zar - d.expenses_zar, d.revenue_usd - d.expenses_usd])
    ]

    // Truck sheet: Truck, Trips, KM, Revenue (ZAR), Revenue (USD), Expenses (ZAR), Expenses (USD), Profit (ZAR), Profit (USD)
    const truckData = [
      ['Truck', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
      ...Array.from(truckMap.entries())
        .sort((a, b) => (b[1].revenue_zar + b[1].revenue_usd) - (a[1].revenue_zar + a[1].revenue_usd))
        .map(([name, d]) => [name, d.trips, d.km, d.revenue_zar, d.revenue_usd, d.expenses_zar, d.expenses_usd, d.revenue_zar - d.expenses_zar, d.revenue_usd - d.expenses_usd])
    ]

    // Weekly sheet: Week, Year, Trips, KM, Revenue (ZAR), Revenue (USD), Expenses (ZAR), Expenses (USD), Profit (ZAR), Profit (USD)
    const weeklyData = [
      ['Week', 'Year', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
      ...Array.from(weeklyMap.values())
        .sort((a, b) => `${b.year}-${b.week}`.localeCompare(`${a.year}-${a.week}`))
        .map(d => [d.week, d.year, d.trips, d.km, d.revenue_zar, d.revenue_usd, d.expenses_zar, d.expenses_usd, d.revenue_zar - d.expenses_zar, d.revenue_usd - d.expenses_usd])
    ]

    // Monthly sheet: Month, Year, Trips, KM, Revenue (ZAR), Revenue (USD), Expenses (ZAR), Expenses (USD), Profit (ZAR), Profit (USD)
    const monthlyData = [
      ['Month', 'Year', 'Trips', 'KM', 'Revenue (ZAR)', 'Revenue (USD)', 'Expenses (ZAR)', 'Expenses (USD)', 'Profit (ZAR)', 'Profit (USD)'],
      ...Array.from(monthlyMap.values())
        .sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))
        .map(d => [d.month, d.year, d.trips, d.km, d.revenue_zar, d.revenue_usd, d.expenses_zar, d.expenses_usd, d.revenue_zar - d.expenses_zar, d.revenue_usd - d.expenses_usd])
    ]

    // Update each sheet
    await updateSheet(accessToken, spreadsheetId, 'Summary', summaryData)
    await updateSheet(accessToken, spreadsheetId, 'By Client', clientData)
    await updateSheet(accessToken, spreadsheetId, 'By Driver', driverData)
    await updateSheet(accessToken, spreadsheetId, 'By Truck', truckData)
    await updateSheet(accessToken, spreadsheetId, 'Weekly', weeklyData)
    await updateSheet(accessToken, spreadsheetId, 'Monthly', monthlyData)

    return new Response(JSON.stringify({
      success: true,
      message: 'Google Sheet updated successfully',
      updated_at: new Date().toISOString(),
      period: period,
      trips_processed: trips.length,
      sheets_updated: ['Summary', 'By Client', 'By Driver', 'By Truck', 'Weekly', 'Monthly'],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Helper: Get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Helper: Get ISO week year
function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}
