/** Azure datacenter region coordinates and display names. */
export interface AzureRegionInfo {
  displayName: string;
  latitude: number;
  longitude: number;
}

export const AZURE_REGIONS: Record<string, AzureRegionInfo> = {
  // Australia
  australiacentral:    { displayName: 'Australia Central',      latitude: -35.3075, longitude: 149.1244 },
  australiacentral2:   { displayName: 'Australia Central 2',    latitude: -35.3075, longitude: 149.1244 },
  australiaeast:       { displayName: 'Australia East',         latitude: -33.8688, longitude: 151.2093 },
  australiasoutheast:  { displayName: 'Australia Southeast',    latitude: -37.8136, longitude: 144.9631 },

  // Austria
  austriaeast:         { displayName: 'Austria East',           latitude: 48.2082,  longitude: 16.3738 },

  // Belgium
  belgiumcentral:      { displayName: 'Belgium Central',        latitude: 50.8503,  longitude: 4.3517 },

  // Brazil
  brazilne:            { displayName: 'Brazil Northeast',       latitude: -8.0476,  longitude: -34.877 },
  brazilse:            { displayName: 'Brazil Southeast',       latitude: -22.9068, longitude: -43.1729 },
  brazilsouth:         { displayName: 'Brazil South',           latitude: -23.5505, longitude: -46.6333 },

  // Canada
  canadacentral:       { displayName: 'Canada Central',         latitude: 43.6532,  longitude: -79.3832 },
  canadaeast:          { displayName: 'Canada East',            latitude: 46.8139,  longitude: -71.2082 },

  // Chile
  chilec:              { displayName: 'Chile Central',          latitude: -33.4489, longitude: -70.6693 },

  // China
  chinaeast:           { displayName: 'China East',             latitude: 31.2304,  longitude: 121.4737 },
  chinaeast2:          { displayName: 'China East 2',           latitude: 31.2304,  longitude: 121.4737 },
  chinaeast3:          { displayName: 'China East 3',           latitude: 31.2304,  longitude: 121.4737 },
  chinanorth:          { displayName: 'China North',            latitude: 39.9042,  longitude: 116.4074 },
  chinanorth2:         { displayName: 'China North 2',          latitude: 39.9042,  longitude: 116.4074 },
  chinanorth3:         { displayName: 'China North 3',          latitude: 39.9042,  longitude: 116.4074 },

  // Europe
  northeurope:         { displayName: 'North Europe',           latitude: 53.3498,  longitude: -6.2603 },
  northeurope2:        { displayName: 'North Europe 2',         latitude: 53.3498,  longitude: -6.2603 },
  westeurope:          { displayName: 'West Europe',            latitude: 52.3676,  longitude: 4.9041 },

  // France
  centralfrance:       { displayName: 'France Central',         latitude: 46.3809,  longitude: 2.2137 },
  southfrance:         { displayName: 'France South',           latitude: 43.6047,  longitude: 1.4442 },

  // Germany
  germanyn:            { displayName: 'Germany North',          latitude: 53.5511,  longitude: 9.9937 },
  germanywc:           { displayName: 'Germany West Central',   latitude: 50.1109,  longitude: 8.6821 },

  // India
  centralindia:        { displayName: 'Central India',          latitude: 18.5204,  longitude: 73.8567 },
  southindia:          { displayName: 'South India',            latitude: 12.9716,  longitude: 80.2707 },
  westindia:           { displayName: 'West India',             latitude: 19.076,   longitude: 72.8777 },
  jioindiacentral:     { displayName: 'Jio India Central',      latitude: 21.1458,  longitude: 79.0882 },
  jioindiawest:        { displayName: 'Jio India West',         latitude: 22.7196,  longitude: 75.8577 },

  // Indonesia
  indonesiacentral:    { displayName: 'Indonesia Central',      latitude: -6.2088,  longitude: 106.8456 },

  // Israel
  israelcentral:       { displayName: 'Israel Central',         latitude: 32.0853,  longitude: 34.7818 },
  israelnorthwest:     { displayName: 'Israel Northwest',       latitude: 32.794,   longitude: 34.9896 },

  // Italy
  italynorth:          { displayName: 'Italy North',            latitude: 45.4642,  longitude: 9.19 },

  // Japan
  japaneast:           { displayName: 'Japan East',             latitude: 35.6762,  longitude: 139.6503 },
  japanwest:           { displayName: 'Japan West',             latitude: 34.6937,  longitude: 135.5023 },

  // Korea
  koreacentral:        { displayName: 'Korea Central',          latitude: 37.5665,  longitude: 126.978 },
  koreasouth:          { displayName: 'Korea South',            latitude: 35.1796,  longitude: 129.0756 },

  // Malaysia
  malaysiasouth:       { displayName: 'Malaysia South',         latitude: 1.4927,   longitude: 103.7414 },
  malaysiawest:        { displayName: 'Malaysia West',          latitude: 3.139,    longitude: 101.6869 },

  // Mexico
  mexicocentral:       { displayName: 'Mexico Central',         latitude: 20.5888,  longitude: -100.3899 },

  // New Zealand
  newzealandnorth:     { displayName: 'New Zealand North',      latitude: -36.8485, longitude: 174.7633 },

  // Norway
  norwaye:             { displayName: 'Norway East',            latitude: 59.9139,  longitude: 10.7522 },
  norwayw:             { displayName: 'Norway West',            latitude: 58.9699,  longitude: 5.7331 },

  // Poland
  polandcentral:       { displayName: 'Poland Central',         latitude: 52.2297,  longitude: 21.0122 },

  // Qatar
  qatarcentral:        { displayName: 'Qatar Central',          latitude: 25.2854,  longitude: 51.531 },

  // South Africa
  southafricanorth:    { displayName: 'South Africa North',     latitude: -25.7479, longitude: 28.2293 },
  southafricawest:     { displayName: 'South Africa West',      latitude: -33.9249, longitude: 18.4241 },

  // Southeast Asia
  eastasia:            { displayName: 'East Asia',              latitude: 22.3193,  longitude: 114.1694 },
  southeastasia:       { displayName: 'Southeast Asia',         latitude: 1.3521,   longitude: 103.8198 },

  // Spain
  spaincentral:        { displayName: 'Spain Central',          latitude: 40.4168,  longitude: -3.7038 },

  // Sweden
  swedencentral:       { displayName: 'Sweden Central',         latitude: 60.6749,  longitude: 17.1413 },
  swedensouth:         { displayName: 'Sweden South',           latitude: 55.6049,  longitude: 13.0038 },

  // Switzerland
  switzerlandn:        { displayName: 'Switzerland North',      latitude: 47.4515,  longitude: 8.5644 },
  switzerlandw:        { displayName: 'Switzerland West',       latitude: 46.204,   longitude: 6.1431 },

  // Taiwan
  taiwannorth:         { displayName: 'Taiwan North',           latitude: 25.033,   longitude: 121.5654 },
  taiwannorthwest:     { displayName: 'Taiwan Northwest',       latitude: 24.8138,  longitude: 120.9675 },

  // UAE
  uaecentral:          { displayName: 'UAE Central',            latitude: 24.4539,  longitude: 54.3773 },
  uaenorth:            { displayName: 'UAE North',              latitude: 25.2048,  longitude: 55.2708 },

  // UK
  uksouth:             { displayName: 'UK South',               latitude: 51.5074,  longitude: -0.1278 },
  ukwest:              { displayName: 'UK West',                latitude: 51.4816,  longitude: -3.1791 },

  // US
  centralus:           { displayName: 'Central US',             latitude: 41.8781,  longitude: -93.0977 },
  centraluseuap:       { displayName: 'Central US EUAP',        latitude: 41.8781,  longitude: -93.0977 },
  eastus:              { displayName: 'East US',                latitude: 37.3719,  longitude: -79.8164 },
  eastus2:             { displayName: 'East US 2',              latitude: 36.6681,  longitude: -78.3889 },
  eastus2euap:         { displayName: 'East US 2 EUAP',         latitude: 36.6681,  longitude: -78.3889 },
  eastus3:             { displayName: 'East US 3',              latitude: 33.7537,  longitude: -84.3863 },
  northcentralus:      { displayName: 'North Central US',       latitude: 41.8819,  longitude: -87.6278 },
  southcentralus:      { displayName: 'South Central US',       latitude: 29.4241,  longitude: -98.4936 },
  southcentralus2:     { displayName: 'South Central US 2',     latitude: 29.4241,  longitude: -98.4936 },
  westcentralus:       { displayName: 'West Central US',        latitude: 40.89,    longitude: -110.2343 },
  westus:              { displayName: 'West US',                latitude: 37.783,   longitude: -122.417 },
  westus2:             { displayName: 'West US 2',              latitude: 47.2332,  longitude: -119.8526 },
  westus3:             { displayName: 'West US 3',              latitude: 33.4484,  longitude: -112.074 },
  southeastus:         { displayName: 'Southeast US',           latitude: 33.749,   longitude: -84.388 },
  southeastus3:        { displayName: 'Southeast US 3',         latitude: 33.749,   longitude: -84.388 },

  // US Gov
  usdodcentral:        { displayName: 'US DoD Central',         latitude: 41.8781,  longitude: -93.0977 },
  usdodeast:           { displayName: 'US DoD East',            latitude: 36.6681,  longitude: -78.3889 },
  usgovarizona:        { displayName: 'US Gov Arizona',         latitude: 33.4484,  longitude: -112.074 },
  usgoviowa:           { displayName: 'US Gov Iowa',            latitude: 41.5868,  longitude: -93.625 },
  usgovtexas:          { displayName: 'US Gov Texas',           latitude: 29.4241,  longitude: -98.4936 },
  usgovvirginia:       { displayName: 'US Gov Virginia',        latitude: 37.4316,  longitude: -78.6569 },

  // US Staging
  usstagec:            { displayName: 'US Stage Central',       latitude: 41.8781,  longitude: -93.0977 },
  usstagee:            { displayName: 'US Stage East',          latitude: 37.3719,  longitude: -79.8164 },
};
