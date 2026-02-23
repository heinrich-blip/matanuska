# Pre-Change Review Checklist

Before making ANY code modifications, complete this checklist:

## 1. Review Recent Changes
- [ ] Read last 5 entries in `CHANGELOG.md`
- [ ] Identify any related recent modifications
- [ ] Check for potential conflicts or dependencies
- [ ] Verify no overlapping changes in target files

## 2. Understand Current State
- [ ] Review affected files in their current state
- [ ] Identify all components that import/depend on target files
- [ ] Map data flow and routing paths
- [ ] Check for existing similar functionality

## 3. Document Planned Change
- [ ] Add new entry to `CHANGELOG.md` with next change number
- [ ] Describe intended modifications
- [ ] List all files to be created/modified/deleted
- [ ] Note any breaking changes or migration steps
- [ ] Estimate impact scope (localized/widespread)

## 4. Execute Change
- [ ] Make code modifications following plan
- [ ] Test affected functionality in preview
- [ ] Verify no console errors
- [ ] Check mobile responsiveness if UI changes

## 5. Post-Change Validation
- [ ] Update `CHANGELOG.md` with completion timestamp
- [ ] Mark entry as "✅ Verified" or "⚠️ Needs Testing"
- [ ] Test user workflows end-to-end
- [ ] Document any unexpected side effects or issues
- [ ] Note any follow-up tasks required

---

## Change Documentation Template

Copy this into CHANGELOG.md for each new change:

```markdown
### Change #XXX - HH:MM UTC
**Type:** [Feature/Refactor/Bugfix/Documentation/Performance]
**Files Created:**
- `path/to/new/file.tsx`

**Files Modified:**
- `path/to/modified/file.tsx`

**Files Deleted:**
- `path/to/removed/file.tsx`

**Changes:**
- Bullet point list of what changed
- Be specific and concise

**Reason:** Why this change was necessary

**Status:** ✅ Verified / ⚠️ Needs Testing / ❌ Reverted
```

---

## Guidelines for Large Codebase Management

### Before Every Change:
1. **Read the changelog** - Understand what changed recently
2. **Search for dependencies** - Find all files importing your target
3. **Plan file structure** - Create new focused components vs. modifying existing
4. **Consider refactoring** - Is this the right time to improve architecture?

### During Changes:
1. **Keep changes focused** - One logical change per commit
2. **Maintain consistency** - Follow existing patterns and naming
3. **Update related files** - Routes, imports, types, tests
4. **Comment complex logic** - Future you will thank present you

### After Changes:
1. **Test thoroughly** - All affected user workflows
2. **Document immediately** - Don't wait, memory fades
3. **Check for side effects** - Did this break anything else?
4. **Update this checklist** - Improve the process as you learn

---

## Common Pitfalls to Avoid

❌ **Making changes without reviewing recent history**
✅ Review last 5 changelog entries before starting

❌ **Modifying files without understanding their dependencies**
✅ Search for all imports of the file first

❌ **Creating duplicate functionality**
✅ Check if similar features already exist

❌ **Forgetting to update routes when adding new pages**
✅ Add route, update Layout navigation, test end-to-end

❌ **Not documenting changes**
✅ Update CHANGELOG.md before AND after changes

❌ **Batch unrelated changes together**
✅ One logical change per session with dedicated changelog entry
