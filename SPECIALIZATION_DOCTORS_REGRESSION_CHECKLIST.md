# Specialization to Doctors Regression Checklist

Purpose: prevent regressions where selected specialization is lost when navigating to the Doctors page.

## Core Navigation

- [ ] Open Home page and click a specialization card.
- [ ] URL includes specialization query param on Doctors page.
- [ ] Doctors API request contains specialization filter.
- [ ] List only shows doctors for selected specialization.

## Deep Link Behavior

- [ ] Directly open Doctors URL with specialization query.
- [ ] Doctors page loads filtered results without additional clicks.
- [ ] Specialization context label is visible when specializationTitle exists.

## Filter Interactions

- [ ] City selector changes location scope but keeps specialization filter.
- [ ] Search input narrows the already-specialized result set.
- [ ] Clearing search does not remove specialization filter.

## Non-specialization Path

- [ ] Open Doctors page from top navigation without specialization query.
- [ ] Doctors page loads unfiltered-by-specialization baseline list.

## Safety Checks

- [ ] No console errors when specialization query is absent.
- [ ] No console errors when specializationTitle contains spaces/symbols.
- [ ] Build passes after changes.
