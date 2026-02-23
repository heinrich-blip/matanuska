import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Driver {
  id: string;
  driver_number: string;
  first_name: string;
  last_name: string;
  license_number: string;
  license_class: string | null;
  license_expiry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export type DriverInsert = Omit<Driver, 'id' | 'created_at' | 'updated_at'>;
export type DriverUpdate = Partial<DriverInsert>;

export const useDrivers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all drivers
  const {
    data: drivers = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Driver[]> => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('first_name');

      if (error) throw error;
      return (data || []) as Driver[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch active drivers only
  const {
    data: activeDrivers = [],
    isLoading: isLoadingActive,
  } = useQuery<Driver[]>({
    queryKey: ['drivers', 'active'],
    queryFn: async (): Promise<Driver[]> => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      return (data || []) as Driver[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Create driver mutation
  const createDriverMutation = useMutation({
    mutationFn: async (driver: DriverInsert) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert([driver])
        .select()
        .single();

      if (error) throw error;
      return data as Driver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: 'Success',
        description: `Driver "${data.first_name} ${data.last_name}" created successfully`,
      });
    },
    onError: (error: Error) => {
      console.error('Error creating driver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create driver',
        variant: 'destructive',
      });
    },
  });

  // Update driver mutation
  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DriverUpdate }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Driver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: 'Success',
        description: `Driver "${data.first_name} ${data.last_name}" updated successfully`,
      });
    },
    onError: (error: Error) => {
      console.error('Error updating driver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update driver',
        variant: 'destructive',
      });
    },
  });

  // Delete driver mutation
  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: 'Success',
        description: 'Driver deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting driver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete driver',
        variant: 'destructive',
      });
    },
  });

  // Get full name helper
  const getDriverFullName = (driver: Driver): string => {
    return `${driver.first_name} ${driver.last_name}`.trim();
  };

  // Find driver by name
  const findDriverByName = (name: string): Driver | undefined => {
    return drivers.find(d =>
      getDriverFullName(d).toLowerCase() === name.toLowerCase()
    );
  };

  return {
    drivers,
    activeDrivers,
    isLoading,
    isLoadingActive,
    error,
    refetch,
    createDriver: createDriverMutation.mutateAsync,
    updateDriver: updateDriverMutation.mutateAsync,
    deleteDriver: deleteDriverMutation.mutateAsync,
    isCreating: createDriverMutation.isPending,
    isUpdating: updateDriverMutation.isPending,
    isDeleting: deleteDriverMutation.isPending,
    getDriverFullName,
    findDriverByName,
  };
};

export default useDrivers;