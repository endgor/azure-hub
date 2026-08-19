/**
 * ARM region names as used by the Azure Retail Prices API (`armRegionName`).
 *
 * Distinct from `azureRegions.ts`, which is keyed by the region IDs used in the
 * Azure IP ranges service tag files (e.g. `germanywc` there vs `germanywestcentral` here).
 */

export type ArmRegionCloud = 'public' | 'government' | 'edgeZone';

export interface ArmRegionInfo {
  displayName: string;
  geography: string;
  cloud: ArmRegionCloud;
}

export const ARM_REGIONS: Record<string, ArmRegionInfo> = {
  // Asia Pacific
  eastasia:            { displayName: 'East Asia',              geography: 'Asia Pacific',   cloud: 'public' },
  southeastasia:       { displayName: 'Southeast Asia',         geography: 'Asia Pacific',   cloud: 'public' },

  // Australia
  australiacentral:    { displayName: 'Australia Central',      geography: 'Australia',      cloud: 'public' },
  australiacentral2:   { displayName: 'Australia Central 2',    geography: 'Australia',      cloud: 'public' },
  australiaeast:       { displayName: 'Australia East',         geography: 'Australia',      cloud: 'public' },
  australiasoutheast:  { displayName: 'Australia Southeast',    geography: 'Australia',      cloud: 'public' },

  // Brazil
  brazilsouth:         { displayName: 'Brazil South',           geography: 'Brazil',         cloud: 'public' },
  brazilsoutheast:     { displayName: 'Brazil Southeast',       geography: 'Brazil',         cloud: 'public' },

  // Canada
  canadacentral:       { displayName: 'Canada Central',         geography: 'Canada',         cloud: 'public' },
  canadaeast:          { displayName: 'Canada East',            geography: 'Canada',         cloud: 'public' },

  // Chile
  chilecentral:        { displayName: 'Chile Central',          geography: 'Chile',          cloud: 'public' },

  // Europe
  northeurope:         { displayName: 'North Europe',           geography: 'Europe',         cloud: 'public' },
  westeurope:          { displayName: 'West Europe',            geography: 'Europe',         cloud: 'public' },
  austriaeast:         { displayName: 'Austria East',           geography: 'Austria',        cloud: 'public' },
  belgiumcentral:      { displayName: 'Belgium Central',        geography: 'Belgium',        cloud: 'public' },
  denmarkeast:         { displayName: 'Denmark East',           geography: 'Denmark',        cloud: 'public' },
  francecentral:       { displayName: 'France Central',         geography: 'France',         cloud: 'public' },
  francesouth:         { displayName: 'France South',           geography: 'France',         cloud: 'public' },
  germanynorth:        { displayName: 'Germany North',          geography: 'Germany',        cloud: 'public' },
  germanywestcentral:  { displayName: 'Germany West Central',   geography: 'Germany',        cloud: 'public' },
  italynorth:          { displayName: 'Italy North',            geography: 'Italy',          cloud: 'public' },
  norwayeast:          { displayName: 'Norway East',            geography: 'Norway',         cloud: 'public' },
  norwaywest:          { displayName: 'Norway West',            geography: 'Norway',         cloud: 'public' },
  polandcentral:       { displayName: 'Poland Central',         geography: 'Poland',         cloud: 'public' },
  spaincentral:        { displayName: 'Spain Central',          geography: 'Spain',          cloud: 'public' },
  swedencentral:       { displayName: 'Sweden Central',         geography: 'Sweden',         cloud: 'public' },
  swedensouth:         { displayName: 'Sweden South',           geography: 'Sweden',         cloud: 'public' },
  switzerlandnorth:    { displayName: 'Switzerland North',      geography: 'Switzerland',    cloud: 'public' },
  switzerlandwest:     { displayName: 'Switzerland West',       geography: 'Switzerland',    cloud: 'public' },
  uksouth:             { displayName: 'UK South',               geography: 'United Kingdom', cloud: 'public' },
  ukwest:              { displayName: 'UK West',                geography: 'United Kingdom', cloud: 'public' },

  // India
  centralindia:        { displayName: 'Central India',          geography: 'India',          cloud: 'public' },
  southindia:          { displayName: 'South India',            geography: 'India',          cloud: 'public' },
  westindia:           { displayName: 'West India',             geography: 'India',          cloud: 'public' },
  indiasouthcentral:   { displayName: 'India South Central',    geography: 'India',          cloud: 'public' },
  jioindiacentral:     { displayName: 'Jio India Central',      geography: 'India',          cloud: 'public' },
  jioindiawest:        { displayName: 'Jio India West',         geography: 'India',          cloud: 'public' },

  // Indonesia
  indonesiacentral:    { displayName: 'Indonesia Central',      geography: 'Indonesia',      cloud: 'public' },

  // Israel
  israelcentral:       { displayName: 'Israel Central',         geography: 'Israel',         cloud: 'public' },
  israelnorthwest:     { displayName: 'Israel Northwest',       geography: 'Israel',         cloud: 'public' },

  // Japan
  japaneast:           { displayName: 'Japan East',             geography: 'Japan',          cloud: 'public' },
  japanwest:           { displayName: 'Japan West',             geography: 'Japan',          cloud: 'public' },

  // Korea
  koreacentral:        { displayName: 'Korea Central',          geography: 'Korea',          cloud: 'public' },
  koreasouth:          { displayName: 'Korea South',            geography: 'Korea',          cloud: 'public' },

  // Malaysia
  malaysiawest:        { displayName: 'Malaysia West',          geography: 'Malaysia',       cloud: 'public' },

  // Mexico
  mexicocentral:       { displayName: 'Mexico Central',         geography: 'Mexico',         cloud: 'public' },

  // New Zealand
  newzealandnorth:     { displayName: 'New Zealand North',      geography: 'New Zealand',    cloud: 'public' },

  // Qatar
  qatarcentral:        { displayName: 'Qatar Central',          geography: 'Qatar',          cloud: 'public' },

  // South Africa
  southafricanorth:    { displayName: 'South Africa North',     geography: 'South Africa',   cloud: 'public' },
  southafricawest:     { displayName: 'South Africa West',      geography: 'South Africa',   cloud: 'public' },

  // United Arab Emirates
  uaecentral:          { displayName: 'UAE Central',            geography: 'UAE',            cloud: 'public' },
  uaenorth:            { displayName: 'UAE North',              geography: 'UAE',            cloud: 'public' },

  // United States
  centralus:           { displayName: 'Central US',             geography: 'United States',  cloud: 'public' },
  eastus:              { displayName: 'East US',                geography: 'United States',  cloud: 'public' },
  eastus2:             { displayName: 'East US 2',              geography: 'United States',  cloud: 'public' },
  northcentralus:      { displayName: 'North Central US',       geography: 'United States',  cloud: 'public' },
  southcentralus:      { displayName: 'South Central US',       geography: 'United States',  cloud: 'public' },
  westcentralus:       { displayName: 'West Central US',        geography: 'United States',  cloud: 'public' },
  westus:              { displayName: 'West US',                geography: 'United States',  cloud: 'public' },
  westus2:             { displayName: 'West US 2',              geography: 'United States',  cloud: 'public' },
  westus3:             { displayName: 'West US 3',              geography: 'United States',  cloud: 'public' },

  // Azure Government
  usgovarizona:        { displayName: 'US Gov Arizona',         geography: 'US Government',  cloud: 'government' },
  usgovtexas:          { displayName: 'US Gov Texas',           geography: 'US Government',  cloud: 'government' },
  usgovvirginia:       { displayName: 'US Gov Virginia',        geography: 'US Government',  cloud: 'government' },

  // Operator / edge zones
  attatlanta1:         { displayName: 'AT&T Atlanta',           geography: 'Edge Zones',     cloud: 'edgeZone' },
  attdallas1:          { displayName: 'AT&T Dallas',            geography: 'Edge Zones',     cloud: 'edgeZone' },
  attdetroit1:         { displayName: 'AT&T Detroit',           geography: 'Edge Zones',     cloud: 'edgeZone' },
  attnewyork1:         { displayName: 'AT&T New York',          geography: 'Edge Zones',     cloud: 'edgeZone' },
  sgxsingapore1:       { displayName: 'SGX Singapore',          geography: 'Edge Zones',     cloud: 'edgeZone' }
};

/** Falls back to a title-cased ARM name so newly launched regions still render sensibly. */
export function getArmRegionInfo(armRegionName: string): ArmRegionInfo {
  const known = ARM_REGIONS[armRegionName];
  if (known) return known;

  return {
    displayName: armRegionName.replace(/\b\w/g, (c) => c.toUpperCase()),
    geography: 'Other',
    cloud: 'public'
  };
}
