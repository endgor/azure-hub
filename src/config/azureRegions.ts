/** Azure datacenter region coordinates, display names, and datacenter cities. */
export interface AzureRegionInfo {
  displayName: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const AZURE_REGIONS: Record<string, AzureRegionInfo> = {
  // Australia
  australiacentral:    { displayName: 'Australia Central',      city: 'Canberra',        latitude: -35.3075, longitude: 149.1244 },
  australiacentral2:   { displayName: 'Australia Central 2',    city: 'Canberra',        latitude: -35.3075, longitude: 149.1244 },
  australiaeast:       { displayName: 'Australia East',         city: 'Sydney',          latitude: -33.8688, longitude: 151.2093 },
  australiasoutheast:  { displayName: 'Australia Southeast',    city: 'Melbourne',       latitude: -37.8136, longitude: 144.9631 },

  // Austria
  austriaeast:         { displayName: 'Austria East',           city: 'Vienna',          latitude: 48.2082,  longitude: 16.3738 },

  // Belgium
  belgiumcentral:      { displayName: 'Belgium Central',        city: 'Brussels',        latitude: 50.8503,  longitude: 4.3517 },

  // Brazil
  brazilne:            { displayName: 'Brazil Northeast',       city: 'Recife',          latitude: -8.0476,  longitude: -34.877 },
  brazilse:            { displayName: 'Brazil Southeast',       city: 'Rio de Janeiro',  latitude: -22.9068, longitude: -43.1729 },
  brazilsouth:         { displayName: 'Brazil South',           city: 'São Paulo',       latitude: -23.5505, longitude: -46.6333 },

  // Canada
  canadacentral:       { displayName: 'Canada Central',         city: 'Toronto',         latitude: 43.6532,  longitude: -79.3832 },
  canadaeast:          { displayName: 'Canada East',            city: 'Quebec City',     latitude: 46.8139,  longitude: -71.2082 },

  // Chile
  chilec:              { displayName: 'Chile Central',          city: 'Santiago',        latitude: -33.4489, longitude: -70.6693 },

  // China
  chinaeast:           { displayName: 'China East',             city: 'Shanghai',        latitude: 31.2304,  longitude: 121.4737 },
  chinaeast2:          { displayName: 'China East 2',           city: 'Shanghai',        latitude: 31.2304,  longitude: 121.4737 },
  chinaeast3:          { displayName: 'China East 3',           city: 'Shanghai',        latitude: 31.2304,  longitude: 121.4737 },
  chinanorth:          { displayName: 'China North',            city: 'Beijing',         latitude: 39.9042,  longitude: 116.4074 },
  chinanorth2:         { displayName: 'China North 2',          city: 'Beijing',         latitude: 39.9042,  longitude: 116.4074 },
  chinanorth3:         { displayName: 'China North 3',          city: 'Beijing',         latitude: 39.9042,  longitude: 116.4074 },

  // Europe
  northeurope:         { displayName: 'North Europe',           city: 'Dublin',          latitude: 53.3498,  longitude: -6.2603 },
  northeurope2:        { displayName: 'North Europe 2',         city: 'Dublin',          latitude: 53.3498,  longitude: -6.2603 },
  westeurope:          { displayName: 'West Europe',            city: 'Amsterdam',       latitude: 52.3676,  longitude: 4.9041 },

  // France
  centralfrance:       { displayName: 'France Central',         city: 'Paris',           latitude: 46.3809,  longitude: 2.2137 },
  southfrance:         { displayName: 'France South',           city: 'Marseille',       latitude: 43.6047,  longitude: 1.4442 },

  // Germany
  germanyn:            { displayName: 'Germany North',          city: 'Hamburg',         latitude: 53.5511,  longitude: 9.9937 },
  germanywc:           { displayName: 'Germany West Central',   city: 'Frankfurt',       latitude: 50.1109,  longitude: 8.6821 },

  // India
  centralindia:        { displayName: 'Central India',          city: 'Pune',            latitude: 18.5204,  longitude: 73.8567 },
  southindia:          { displayName: 'South India',            city: 'Chennai',         latitude: 12.9716,  longitude: 80.2707 },
  westindia:           { displayName: 'West India',             city: 'Mumbai',          latitude: 19.076,   longitude: 72.8777 },
  jioindiacentral:     { displayName: 'Jio India Central',      city: 'Nagpur',          latitude: 21.1458,  longitude: 79.0882 },
  jioindiawest:        { displayName: 'Jio India West',         city: 'Indore',          latitude: 22.7196,  longitude: 75.8577 },

  // Indonesia
  indonesiacentral:    { displayName: 'Indonesia Central',      city: 'Jakarta',         latitude: -6.2088,  longitude: 106.8456 },

  // Israel
  israelcentral:       { displayName: 'Israel Central',         city: 'Tel Aviv',        latitude: 32.0853,  longitude: 34.7818 },
  israelnorthwest:     { displayName: 'Israel Northwest',       city: 'Haifa',           latitude: 32.794,   longitude: 34.9896 },

  // Italy
  italynorth:          { displayName: 'Italy North',            city: 'Milan',           latitude: 45.4642,  longitude: 9.19 },

  // Japan
  japaneast:           { displayName: 'Japan East',             city: 'Tokyo',           latitude: 35.6762,  longitude: 139.6503 },
  japanwest:           { displayName: 'Japan West',             city: 'Osaka',           latitude: 34.6937,  longitude: 135.5023 },

  // Korea
  koreacentral:        { displayName: 'Korea Central',          city: 'Seoul',           latitude: 37.5665,  longitude: 126.978 },
  koreasouth:          { displayName: 'Korea South',            city: 'Busan',           latitude: 35.1796,  longitude: 129.0756 },

  // Malaysia
  malaysiasouth:       { displayName: 'Malaysia South',         city: 'Johor Bahru',     latitude: 1.4927,   longitude: 103.7414 },
  malaysiawest:        { displayName: 'Malaysia West',          city: 'Kuala Lumpur',    latitude: 3.139,    longitude: 101.6869 },

  // Mexico
  mexicocentral:       { displayName: 'Mexico Central',         city: 'Querétaro',       latitude: 20.5888,  longitude: -100.3899 },

  // New Zealand
  newzealandnorth:     { displayName: 'New Zealand North',      city: 'Auckland',        latitude: -36.8485, longitude: 174.7633 },

  // Norway
  norwaye:             { displayName: 'Norway East',            city: 'Oslo',            latitude: 59.9139,  longitude: 10.7522 },
  norwayw:             { displayName: 'Norway West',            city: 'Stavanger',       latitude: 58.9699,  longitude: 5.7331 },

  // Poland
  polandcentral:       { displayName: 'Poland Central',         city: 'Warsaw',          latitude: 52.2297,  longitude: 21.0122 },

  // Qatar
  qatarcentral:        { displayName: 'Qatar Central',          city: 'Doha',            latitude: 25.2854,  longitude: 51.531 },

  // South Africa
  southafricanorth:    { displayName: 'South Africa North',     city: 'Johannesburg',    latitude: -25.7479, longitude: 28.2293 },
  southafricawest:     { displayName: 'South Africa West',      city: 'Cape Town',       latitude: -33.9249, longitude: 18.4241 },

  // Southeast Asia
  eastasia:            { displayName: 'East Asia',              city: 'Hong Kong',       latitude: 22.3193,  longitude: 114.1694 },
  southeastasia:       { displayName: 'Southeast Asia',         city: 'Singapore',       latitude: 1.3521,   longitude: 103.8198 },

  // Spain
  spaincentral:        { displayName: 'Spain Central',          city: 'Madrid',          latitude: 40.4168,  longitude: -3.7038 },

  // Sweden
  swedencentral:       { displayName: 'Sweden Central',         city: 'Gävle',           latitude: 60.6749,  longitude: 17.1413 },
  swedensouth:         { displayName: 'Sweden South',           city: 'Malmö',           latitude: 55.6049,  longitude: 13.0038 },

  // Switzerland
  switzerlandn:        { displayName: 'Switzerland North',      city: 'Zürich',          latitude: 47.4515,  longitude: 8.5644 },
  switzerlandw:        { displayName: 'Switzerland West',       city: 'Geneva',          latitude: 46.204,   longitude: 6.1431 },

  // Taiwan
  taiwannorth:         { displayName: 'Taiwan North',           city: 'Taipei',          latitude: 25.033,   longitude: 121.5654 },
  taiwannorthwest:     { displayName: 'Taiwan Northwest',       city: 'Hsinchu',         latitude: 24.8138,  longitude: 120.9675 },

  // UAE
  uaecentral:          { displayName: 'UAE Central',            city: 'Abu Dhabi',       latitude: 24.4539,  longitude: 54.3773 },
  uaenorth:            { displayName: 'UAE North',              city: 'Dubai',           latitude: 25.2048,  longitude: 55.2708 },

  // UK
  uksouth:             { displayName: 'UK South',               city: 'London',          latitude: 51.5074,  longitude: -0.1278 },
  ukwest:              { displayName: 'UK West',                city: 'Cardiff',         latitude: 51.4816,  longitude: -3.1791 },

  // US
  centralus:           { displayName: 'Central US',             city: 'Des Moines',      latitude: 41.8781,  longitude: -93.0977 },
  centraluseuap:       { displayName: 'Central US EUAP',        city: 'Des Moines',      latitude: 41.8781,  longitude: -93.0977 },
  eastus:              { displayName: 'East US',                city: 'Virginia',        latitude: 37.3719,  longitude: -79.8164 },
  eastus2:             { displayName: 'East US 2',              city: 'Virginia',        latitude: 36.6681,  longitude: -78.3889 },
  eastus2euap:         { displayName: 'East US 2 EUAP',         city: 'Virginia',        latitude: 36.6681,  longitude: -78.3889 },
  eastus3:             { displayName: 'East US 3',              city: 'Atlanta',         latitude: 33.7537,  longitude: -84.3863 },
  northcentralus:      { displayName: 'North Central US',       city: 'Chicago',         latitude: 41.8819,  longitude: -87.6278 },
  southcentralus:      { displayName: 'South Central US',       city: 'San Antonio',     latitude: 29.4241,  longitude: -98.4936 },
  southcentralus2:     { displayName: 'South Central US 2',     city: 'San Antonio',     latitude: 29.4241,  longitude: -98.4936 },
  westcentralus:       { displayName: 'West Central US',        city: 'Cheyenne',        latitude: 40.89,    longitude: -110.2343 },
  westus:              { displayName: 'West US',                city: 'San Francisco',   latitude: 37.783,   longitude: -122.417 },
  westus2:             { displayName: 'West US 2',              city: 'Quincy',          latitude: 47.2332,  longitude: -119.8526 },
  westus3:             { displayName: 'West US 3',              city: 'Phoenix',         latitude: 33.4484,  longitude: -112.074 },
  southeastus:         { displayName: 'Southeast US',           city: 'Atlanta',         latitude: 33.749,   longitude: -84.388 },
  southeastus3:        { displayName: 'Southeast US 3',         city: 'Atlanta',         latitude: 33.749,   longitude: -84.388 },

  // US Gov
  usdodcentral:        { displayName: 'US DoD Central',         city: 'Des Moines',      latitude: 41.8781,  longitude: -93.0977 },
  usdodeast:           { displayName: 'US DoD East',            city: 'Virginia',        latitude: 36.6681,  longitude: -78.3889 },
  usgovarizona:        { displayName: 'US Gov Arizona',         city: 'Phoenix',         latitude: 33.4484,  longitude: -112.074 },
  usgoviowa:           { displayName: 'US Gov Iowa',            city: 'Des Moines',      latitude: 41.5868,  longitude: -93.625 },
  usgovtexas:          { displayName: 'US Gov Texas',           city: 'San Antonio',     latitude: 29.4241,  longitude: -98.4936 },
  usgovvirginia:       { displayName: 'US Gov Virginia',        city: 'Virginia',        latitude: 37.4316,  longitude: -78.6569 },

  // US Staging
  usstagec:            { displayName: 'US Stage Central',       city: 'Des Moines',      latitude: 41.8781,  longitude: -93.0977 },
  usstagee:            { displayName: 'US Stage East',          city: 'Virginia',        latitude: 37.3719,  longitude: -79.8164 },
};
