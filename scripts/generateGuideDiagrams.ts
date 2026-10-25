/**
 * Generates the network diagrams used by the networking guides, in an
 * Azure Architecture Center style.
 *
 * Icons are Microsoft's Azure architecture icons from @squinch/pack-azure,
 * embedded byte-for-byte as data URIs. Microsoft permits their use in
 * documentation as long as they are not modified, so never edit the icon
 * files or post-process the output with an SVG optimizer.
 *
 * Run with: npm run generate-guide-diagrams
 */
import * as fs from 'fs';
import * as path from 'path';

const ICONS_DIR = path.join(process.cwd(), 'node_modules', '@squinch', 'pack-azure', 'icons');
const PUBLIC_GUIDES_DIR = path.join(process.cwd(), 'public', 'guides');

const FONT = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";
const MONO = 'ui-monospace, Consolas, Menlo, monospace';
const TXT = '#323130';
const SUB = '#605e5c';
const BLUE = '#0078d4';
const RED = '#d13438';
const GREEN = '#107c10';
const GREY = '#8a8886';
const LINE = '#323130';

type Point = [number, number];

interface TextOptions {
  size?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
}

/** A line of text, or a line with its own overrides on top of the shared options. */
type Line = string | [string, TextOptions];

interface BoxOptions {
  label?: string;
  icon?: string;
  stroke?: string;
  fill?: string;
  dashed?: boolean;
  sublabel?: string;
}

interface ArrowOptions {
  color?: string;
  dashed?: boolean;
  head?: boolean;
  width?: number;
}

const iconCache = new Map<string, string>();

function iconUri(name: string): string {
  let uri = iconCache.get(name);
  if (!uri) {
    const data = fs.readFileSync(path.join(ICONS_DIR, `${name}.svg`));
    uri = `data:image/svg+xml;base64,${data.toString('base64')}`;
    iconCache.set(name, uri);
  }
  return uri;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class Diagram {
  private parts: string[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly title: string,
    private readonly desc: string
  ) {}

  add(markup: string): void {
    this.parts.push(markup);
  }

  icon(name: string, cx: number, cy: number, size = 48): void {
    this.add(`<image href="${iconUri(name)}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}"/>`);
  }

  text(x: number, y: number, value: string, options: TextOptions = {}): void {
    const { size = 12, color = TXT, weight = 400, anchor = 'middle', mono = false } = options;
    const family = mono ? MONO : FONT;
    this.add(
      `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escapeXml(value)}</text>`
    );
  }

  lines(x: number, y: number, items: Line[], options: TextOptions = {}, step = 15): void {
    items.forEach((item, i) => {
      if (typeof item === 'string') {
        this.text(x, y + i * step, item, options);
      } else {
        this.text(x, y + i * step, item[0], { ...options, ...item[1] });
      }
    });
  }

  box(x: number, y: number, w: number, h: number, options: BoxOptions = {}): void {
    const { label, icon, stroke = GREY, fill = '#ffffff', dashed = false, sublabel } = options;
    const dash = dashed ? ' stroke-dasharray="5 4"' : '';
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash}/>`);
    let tx = x + 10;
    if (icon) {
      this.icon(icon, x + 20, y + 20, 22);
      tx = x + 38;
    }
    if (label) {
      this.text(tx, y + 25, label, { weight: 600, anchor: 'start' });
    }
    if (sublabel) {
      this.text(tx, y + 41, sublabel, { size: 11, color: SUB, anchor: 'start' });
    }
  }

  /** Plain service node for things without an official icon, such as public DNS. */
  node(x: number, y: number, w: number, h: number, title: string, sub?: string): void {
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#f3f2f1" stroke="${GREY}"/>`);
    const cy = y + h / 2 + (sub ? -3 : 4);
    this.text(x + w / 2, cy, title, { weight: 600 });
    if (sub) {
      this.text(x + w / 2, cy + 16, sub, { size: 11, color: SUB });
    }
  }

  arrow(points: Point[], options: ArrowOptions = {}): void {
    const { color = LINE, dashed = false, head = true, width = 1.5 } = options;
    const d = 'M' + points.map(([x, y]) => `${x} ${y}`).join(' L');
    const dash = dashed ? ' stroke-dasharray="6 4"' : '';
    const marker = head ? ` marker-end="url(#${color === RED ? 'ar' : 'ak'})"` : '';
    this.add(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"${dash}${marker}/>`);
  }

  step(cx: number, cy: number, n: number, color = BLUE): void {
    this.add(`<circle cx="${cx}" cy="${cy}" r="10" fill="${color}"/>`);
    this.text(cx, cy + 4, String(n), { size: 11, color: '#ffffff', weight: 700 });
  }

  blocked(cx: number, cy: number): void {
    this.add(`<circle cx="${cx}" cy="${cy}" r="9" fill="#ffffff" stroke="${RED}" stroke-width="1.5"/>`);
    this.add(
      `<path d="M${cx - 4} ${cy - 4} L${cx + 4} ${cy + 4} M${cx + 4} ${cy - 4} L${cx - 4} ${cy + 4}" stroke="${RED}" stroke-width="1.8"/>`
    );
  }

  cloud(cx: number, cy: number, label: string): void {
    this.add(
      `<path d="M${cx - 52} ${cy + 18} A18 18 0 0 1 ${cx - 40} ${cy - 10} A24 24 0 0 1 ${cx} ${cy - 24} ` +
        `A22 22 0 0 1 ${cx + 36} ${cy - 8} A17 17 0 0 1 ${cx + 52} ${cy + 18} Z" fill="#ffffff" stroke="${GREY}" stroke-width="1.5"/>`
    );
    this.text(cx, cy + 9, label, { weight: 600 });
  }

  toSvg(): string {
    const marker = (id: string, color: string) =>
      `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${color}"/></marker>`;
    const head =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" role="img" aria-labelledby="t d">\n` +
      `<title id="t">${escapeXml(this.title)}</title>\n<desc id="d">${escapeXml(this.desc)}</desc>\n` +
      `<defs>${marker('ak', LINE)}${marker('ar', RED)}</defs>\n` +
      `<rect x="0.5" y="0.5" width="${this.width - 1}" height="${this.height - 1}" fill="#ffffff" stroke="#e1dfdd"/>\n`;
    return head + this.parts.join('\n') + '\n</svg>\n';
  }
}

function serviceEndpointFlow(): string {
  const d = new Diagram(
    960,
    600,
    'Service endpoint traffic flow',
    "A VM in a subnet with a Microsoft.Storage service endpoint reaches the storage account's public endpoint over the " +
      'Azure backbone using its private source IP. The service endpoint route bypasses the hub firewall. On-premises ' +
      'and internet clients are rejected by the storage firewall.'
  );

  // Spoke VNet with the app subnet
  d.box(30, 30, 440, 300, { label: 'vnet-spoke', icon: 'virtual-networks', stroke: BLUE, sublabel: '10.1.0.0/16' });
  d.box(50, 90, 400, 220, {
    label: 'snet-app  10.1.1.0/24',
    icon: 'subnet',
    dashed: true,
    sublabel: 'Service endpoint: Microsoft.Storage',
  });
  d.icon('virtual-machine', 120, 180);
  d.lines(120, 222, [['VM', { weight: 600 }], '10.1.1.4']);
  // Effective routes callout
  d.add('<rect x="200" y="226" width="236" height="70" fill="#f3f2f1" stroke="#c8c6c4"/>');
  d.icon('route-tables', 216, 244, 20);
  d.text(232, 248, 'Effective routes on the VM NIC', { size: 11, weight: 600, anchor: 'start' });
  d.text(212, 268, '0.0.0.0/0 → Azure Firewall (UDR)', { size: 11, color: SUB, anchor: 'start' });
  d.text(212, 285, 'Storage prefixes → service endpoint ✓', { size: 11, color: GREEN, weight: 600, anchor: 'start' });

  // Hub VNet with firewall
  d.box(30, 420, 440, 150, { label: 'vnet-hub', icon: 'virtual-networks', stroke: BLUE, sublabel: '10.0.0.0/16' });
  d.icon('firewalls', 380, 500);
  d.text(380, 542, 'Azure Firewall', { weight: 600 });
  d.lines(
    50,
    486,
    [
      'Storage traffic never reaches the firewall:',
      'service endpoint routes override UDRs',
      'and BGP routes for the service prefixes.',
    ],
    { size: 11, color: SUB, anchor: 'start' }
  );

  // Other traffic VM -> firewall
  d.arrow(
    [
      [120, 248],
      [120, 395],
      [380, 395],
      [380, 472],
    ],
    { color: GREY, dashed: true }
  );
  d.text(130, 360, 'Other internet-bound traffic', { size: 11, color: SUB, anchor: 'start' });
  d.text(130, 375, 'follows 0.0.0.0/0 to the firewall', { size: 11, color: SUB, anchor: 'start' });

  // Azure Storage (PaaS)
  d.box(620, 30, 310, 360, { label: 'Azure Storage (PaaS)', stroke: '#c8c6c4', fill: '#faf9f8' });
  d.icon('storage-accounts', 775, 180);
  d.lines(775, 222, [['mystorage', { weight: 600 }], 'Public endpoint 20.60.x.x']);
  d.add('<rect x="640" y="262" width="270" height="108" fill="#ffffff" stroke="#c8c6c4"/>');
  d.text(652, 284, 'Networking: selected networks', { size: 11, weight: 600, anchor: 'start' });
  d.text(652, 304, '✓ Allow vnet-spoke / snet-app', { size: 11, color: GREEN, anchor: 'start' });
  d.text(652, 322, '✗ Deny everything else', { size: 11, color: RED, anchor: 'start' });
  d.text(652, 344, 'DNS is unchanged: the name still', { size: 11, color: SUB, anchor: 'start' });
  d.text(652, 359, 'resolves to the public IP.', { size: 11, color: SUB, anchor: 'start' });

  // Flow 1: VM -> storage over the backbone
  d.arrow([
    [146, 180],
    [747, 180],
  ]);
  d.step(500, 180, 1);
  d.lines(545, 142, ['To 20.60.x.x (public)', 'From 10.1.1.4 (private)'], { size: 11 });
  d.text(545, 200, 'Azure backbone', { size: 11, color: SUB });

  // On-premises
  d.box(620, 460, 150, 110, { label: 'On-premises' });
  d.icon('users', 695, 515, 40);
  d.text(695, 554, 'VPN / ExpressRoute', { size: 11, color: SUB });
  d.arrow(
    [
      [695, 460],
      [695, 394],
    ],
    { color: RED, dashed: true }
  );
  d.blocked(695, 427);
  d.step(671, 427, 2, RED);

  // Internet
  d.box(790, 460, 140, 110, { label: 'Internet' });
  d.icon('users', 860, 515, 40);
  d.text(860, 554, 'Any public client', { size: 11, color: SUB });
  d.arrow(
    [
      [860, 460],
      [860, 394],
    ],
    { color: RED, dashed: true }
  );
  d.blocked(860, 427);
  d.step(836, 427, 3, RED);

  return d.toSvg();
}

function privateEndpointFlow(): string {
  const d = new Diagram(
    1040,
    640,
    'Private endpoint traffic flow',
    'A private endpoint with IP 10.2.1.5 in a spoke VNet fronts a storage account with public access disabled. ' +
      'A VM in the spoke and an on-premises client over VPN or ExpressRoute (through the hub gateway and optional ' +
      'Azure Firewall) both connect to the private IP. The DNS Private Resolver answers from a private DNS zone linked ' +
      'to the hub. Public clients reach the storage public endpoint over the internet and are blocked.'
  );

  // On-premises
  d.box(20, 50, 190, 250, { label: 'On-premises' });
  d.icon('users', 115, 165);
  d.lines(115, 207, [['Client', { weight: 600 }], '192.168.10.20']);
  d.lines(34, 252, ['Conditional forwarder:', ['blob.core.windows.net', { mono: true }], '→ 10.0.4.4 (resolver)'], {
    size: 11,
    color: SUB,
    anchor: 'start',
  });

  // Hub VNet
  d.box(270, 50, 330, 300, { label: 'vnet-hub', icon: 'virtual-networks', stroke: BLUE, sublabel: '10.0.0.0/16' });
  d.icon('virtual-network-gateways', 350, 165);
  d.lines(350, 207, [['VPN / ExpressRoute', { weight: 600 }], 'gateway']);
  d.icon('firewalls', 520, 165);
  d.lines(520, 207, [['Azure Firewall', { weight: 600 }], '(optional, SNAT)']);
  d.icon('dns-private-resolver', 350, 275);
  d.lines(350, 317, [['DNS Private Resolver', { weight: 600 }], 'inbound 10.0.4.4']);

  // Spoke VNet
  d.box(660, 50, 360, 300, {
    label: 'vnet-spoke',
    icon: 'virtual-networks',
    stroke: BLUE,
    sublabel: '10.2.0.0/16 · peered to hub',
  });
  d.box(675, 100, 160, 235, { label: 'snet-pe', icon: 'subnet', dashed: true });
  d.box(850, 100, 155, 235, { label: 'snet-app', icon: 'subnet', dashed: true });
  d.icon('private-endpoints', 755, 165);
  d.lines(755, 207, [['Private endpoint', { weight: 600 }], '10.2.1.5']);
  d.icon('virtual-machine', 928, 165);
  d.lines(928, 207, [['VM', { weight: 600 }], '10.2.2.4']);

  // Flow 1: VM -> private endpoint
  d.arrow([
    [904, 165],
    [781, 165],
  ]);
  d.step(842, 165, 1);

  // Flow 2: on-premises -> gateway -> firewall -> private endpoint
  d.arrow([
    [139, 165],
    [324, 165],
  ]);
  d.step(240, 165, 2);
  d.text(240, 192, 'VPN / ER', { size: 11, color: SUB });
  d.arrow([
    [376, 165],
    [494, 165],
  ]);
  d.arrow([
    [546, 165],
    [729, 165],
  ]);
  d.text(630, 155, 'Peering', { size: 11, color: SUB });

  // Private Link: private endpoint -> storage
  d.arrow(
    [
      [755, 232],
      [755, 398],
    ],
    { width: 2 }
  );
  d.text(765, 378, 'Private Link', { size: 11, color: SUB, anchor: 'start' });

  // Private DNS zone (global resource)
  d.box(270, 400, 330, 130, {
    label: 'Private DNS zone',
    icon: 'dns-zones',
    fill: '#faf9f8',
    sublabel: 'Global resource, linked to vnet-hub',
  });
  d.text(290, 488, 'privatelink.blob.core.windows.net', { size: 11, anchor: 'start', mono: true });
  d.text(290, 508, 'A   mystorage → 10.2.1.5', { size: 11, anchor: 'start', mono: true });
  // Resolver -> zone lookup, routed to the right of the resolver labels
  d.arrow(
    [
      [376, 275],
      [440, 275],
      [440, 396],
    ],
    { color: GREY, dashed: true }
  );
  d.text(450, 375, 'Lookup', { size: 11, color: SUB, anchor: 'start' });

  // Storage account
  d.box(660, 400, 360, 130, { label: 'Azure Storage (PaaS)', stroke: '#c8c6c4', fill: '#faf9f8' });
  d.icon('storage-accounts', 755, 450);
  d.lines(755, 492, [['mystorage', { weight: 600 }], 'Public access: Disabled']);
  d.lines(850, 446, ['Reachable only through', 'approved private', 'endpoint connections'], {
    size: 11,
    color: SUB,
    anchor: 'start',
  });

  // Public client, blocked at the public endpoint
  d.box(20, 400, 190, 130, { label: 'Public client' });
  d.icon('users', 115, 465, 40);
  d.text(115, 508, 'Resolves the public IP', { size: 11, color: SUB });
  const [cx, cy] = [420, 586];
  d.arrow(
    [
      [115, 530],
      [115, 590],
      [cx - 52, 590],
    ],
    { color: RED, dashed: true, head: false }
  );
  d.cloud(cx, cy, 'Internet');
  d.arrow(
    [
      [cx + 52, 590],
      [930, 590],
      [930, 534],
    ],
    { color: RED, dashed: true }
  );
  d.blocked(930, 562);
  d.step(906, 562, 3, RED);
  d.text(915, 612, 'Blocked at the public endpoint: public network access is disabled', {
    size: 11,
    color: RED,
    anchor: 'end',
  });

  return d.toSvg();
}

function dnsSplitHorizon(): string {
  const d = new Diagram(
    1040,
    560,
    'Private endpoint DNS: one name, two answers',
    'Inside a VNet linked to the private DNS zone, Azure DNS follows the public CNAME to the privatelink name and ' +
      'answers from the private DNS zone with the private IP. Anywhere else, public DNS follows the same CNAME and ' +
      'returns the public IP.'
  );

  // Lane 1: inside a linked VNet
  d.box(20, 30, 1000, 210, { label: 'Inside a VNet linked to the Private DNS zone', stroke: BLUE });
  d.icon('virtual-machine', 100, 140);
  d.lines(100, 182, [['VM', { weight: 600 }], '10.1.1.4']);
  d.icon('dns-zones', 340, 140);
  d.lines(340, 182, [['Azure DNS', { weight: 600 }], '168.63.129.16']);
  d.icon('dns-zones', 620, 140);
  d.lines(620, 182, [['Private DNS zone', { weight: 600 }], 'linked to the VNet']);
  d.add(`<rect x="790" y="110" width="210" height="60" fill="#dff6dd" stroke="${GREEN}"/>`);
  d.text(895, 135, 'mystorage.privatelink...', { size: 11, mono: true });
  d.text(895, 156, 'A  10.0.1.5 (private)', { weight: 600, color: GREEN });
  d.arrow([
    [124, 140],
    [314, 140],
  ]);
  d.step(220, 140, 1);
  d.arrow([
    [366, 140],
    [594, 140],
  ]);
  d.step(480, 140, 3);
  d.arrow([
    [646, 140],
    [786, 140],
  ]);

  // Shared public CNAME record
  d.add(`<rect x="180" y="262" width="680" height="56" fill="#ffffff" stroke="${GREY}"/>`);
  d.text(196, 284, 'Public DNS (global)', { size: 11, weight: 600, anchor: 'start' });
  d.text(196, 304, 'mystorage.blob.core.windows.net  CNAME  mystorage.privatelink.blob.core.windows.net', {
    size: 11,
    anchor: 'start',
    mono: true,
  });
  d.arrow(
    [
      [340, 214],
      [340, 258],
    ],
    { color: GREY, dashed: true }
  );
  d.step(340, 236, 2);
  d.arrow(
    [
      [340, 408],
      [340, 322],
    ],
    { color: GREY, dashed: true }
  );
  d.step(340, 375, 2);

  // Lane 2: everywhere else
  d.box(20, 340, 1000, 200, { label: 'Anywhere else: internet, on-premises without forwarding, unlinked VNets' });
  d.icon('users', 100, 440);
  d.lines(100, 482, [['Client', { weight: 600 }], 'any network']);
  d.node(270, 412, 140, 56, 'Public resolver', 'ISP, 8.8.8.8, ...');
  d.node(540, 412, 160, 56, 'Microsoft public zone', 'privatelink.blob...');
  d.add(`<rect x="790" y="410" width="210" height="60" fill="#fde7e9" stroke="${RED}"/>`);
  d.text(895, 435, 'mystorage.privatelink...', { size: 11, mono: true });
  d.text(895, 456, 'A  20.60.x.x (public)', { weight: 600, color: RED });
  d.arrow([
    [124, 440],
    [266, 440],
  ]);
  d.step(195, 440, 1);
  d.arrow([
    [410, 440],
    [536, 440],
  ]);
  d.step(473, 440, 3);
  d.arrow([
    [700, 440],
    [786, 440],
  ]);

  return d.toSvg();
}

function dnsHubSpoke(): string {
  const d = new Diagram(
    1040,
    560,
    'Hub-and-spoke DNS with Azure DNS Private Resolver',
    'Spoke VNets use the DNS Private Resolver inbound endpoint in the hub as their DNS server. The resolver asks ' +
      'Azure DNS, which answers from private DNS zones linked only to the hub. The VM then connects directly to the ' +
      'private endpoint.'
  );

  // Spoke A
  d.box(20, 40, 340, 330, {
    label: 'vnet-spoke-a',
    icon: 'virtual-networks',
    stroke: BLUE,
    sublabel: 'DNS servers: 10.0.4.4 (custom)',
  });
  d.icon('virtual-machine', 100, 140);
  d.lines(100, 182, [['VM', { weight: 600 }], '10.2.2.4']);
  d.icon('private-endpoints', 100, 280);
  d.lines(100, 322, [['Private endpoint', { weight: 600 }], '10.2.1.5']);
  d.arrow([
    [100, 206],
    [100, 252],
  ]);
  d.step(100, 229, 4);
  d.lines(180, 270, ['No Private DNS zone', 'links needed here'], { size: 11, color: SUB, anchor: 'start' });

  // Hub
  d.box(420, 40, 300, 330, { label: 'vnet-hub', icon: 'virtual-networks', stroke: BLUE, sublabel: '10.0.0.0/16' });
  d.icon('dns-private-resolver', 570, 140);
  d.lines(570, 182, [['DNS Private Resolver', { weight: 600 }], 'inbound endpoint 10.0.4.4']);
  d.icon('dns-zones', 570, 270);
  d.lines(570, 312, [['Azure DNS', { weight: 600 }], '168.63.129.16']);
  d.arrow([
    [570, 206],
    [570, 242],
  ]);
  d.step(590, 224, 2);
  d.lines(612, 262, ['Uses the zones', 'linked to vnet-hub'], { size: 11, color: SUB, anchor: 'start' });

  // Other spokes
  d.box(780, 40, 240, 150, {
    label: 'vnet-spoke-b',
    icon: 'virtual-networks',
    stroke: BLUE,
    sublabel: 'DNS servers: 10.0.4.4',
  });
  d.icon('virtual-machine', 900, 140, 40);
  d.box(780, 220, 240, 150, {
    label: 'vnet-spoke-c ...',
    icon: 'virtual-networks',
    stroke: BLUE,
    sublabel: 'DNS servers: 10.0.4.4',
  });
  d.icon('virtual-machine', 900, 320, 40);

  // Queries to the resolver
  d.arrow([
    [124, 140],
    [544, 140],
  ]);
  d.step(300, 140, 1);
  d.text(255, 125, 'DNS query over peering', { size: 11, color: SUB });
  d.arrow(
    [
      [876, 140],
      [596, 140],
    ],
    { color: GREY }
  );
  d.arrow(
    [
      [876, 320],
      [750, 320],
      [750, 140],
    ],
    { color: GREY, head: false }
  );
  d.add(`<circle cx="750" cy="140" r="3" fill="${GREY}"/>`);

  // Zones
  d.box(420, 420, 300, 110, {
    label: 'Private DNS zones',
    icon: 'dns-zones',
    fill: '#faf9f8',
    sublabel: 'Linked to vnet-hub only',
  });
  d.text(440, 490, 'privatelink.blob.core.windows.net', { size: 11, anchor: 'start', mono: true });
  d.text(440, 508, 'privatelink.vaultcore.azure.net ...', { size: 11, anchor: 'start', mono: true });
  d.arrow([
    [570, 336],
    [570, 416],
  ]);
  d.step(570, 395, 3);
  d.lines(
    740,
    455,
    ['One zone per service type,', 'one link to the hub.', 'Every spoke resolves', 'through the resolver.'],
    { size: 11, color: SUB, anchor: 'start' }
  );

  return d.toSvg();
}

function dnsHybridFlow(): string {
  const d = new Diagram(
    1040,
    600,
    'Hybrid private endpoint DNS resolution',
    'An on-premises client asks its DNS server, which conditionally forwards blob.core.windows.net over VPN or ' +
      'ExpressRoute to the DNS Private Resolver inbound endpoint. The resolver asks Azure DNS, which follows the ' +
      'public CNAME and answers from the private DNS zone linked to the hub. The client then connects to the private ' +
      'endpoint IP over VPN or ExpressRoute.'
  );

  // On-premises
  d.box(20, 40, 300, 300, { label: 'On-premises' });
  d.icon('users', 80, 140);
  d.lines(80, 182, [['Client', { weight: 600 }], '192.168.10.20']);
  d.icon('server-farm', 250, 140);
  d.lines(250, 182, [['DNS server / DC', { weight: 600 }], '192.168.1.10']);
  d.add('<rect x="150" y="230" width="166" height="92" fill="#f3f2f1" stroke="#c8c6c4"/>');
  d.text(160, 250, 'Conditional forwarder', { size: 11, weight: 600, anchor: 'start' });
  d.text(160, 268, 'blob.core.windows.net', { size: 11, anchor: 'start', mono: true });
  d.text(160, 286, '→ 10.0.4.4', { size: 11, anchor: 'start' });
  d.text(160, 308, '(public zone name!)', { size: 11, color: SUB, anchor: 'start' });
  d.arrow(
    [
      [104, 140],
      [224, 140],
    ],
    { color: SUB, dashed: true }
  );
  d.step(164, 140, 1);

  // Hub
  d.box(390, 40, 410, 300, { label: 'vnet-hub', icon: 'virtual-networks', stroke: BLUE, sublabel: '10.0.0.0/16' });
  d.icon('dns-private-resolver', 470, 140);
  d.lines(470, 182, [['DNS Private Resolver', { weight: 600 }], 'inbound 10.0.4.4']);
  d.icon('dns-zones', 660, 140);
  d.lines(660, 182, [['Azure DNS', { weight: 600 }], '168.63.129.16']);
  d.arrow(
    [
      [276, 140],
      [444, 140],
    ],
    { color: SUB, dashed: true }
  );
  d.step(355, 140, 2);
  d.text(355, 125, 'VPN / ER', { size: 11, color: SUB });
  d.arrow(
    [
      [496, 140],
      [634, 140],
    ],
    { color: SUB, dashed: true }
  );
  d.step(565, 140, 3);
  d.step(660, 236, 4);
  d.lines(678, 232, ['Follows the public', 'CNAME to the', 'privatelink name'], { size: 11, color: SUB, anchor: 'start' });
  d.arrow(
    [
      [660, 206],
      [660, 226],
    ],
    { color: SUB, dashed: true, head: false }
  );
  d.arrow(
    [
      [660, 246],
      [660, 416],
    ],
    { color: SUB, dashed: true }
  );

  // Spoke with the private endpoint
  d.box(850, 40, 170, 300, { label: 'vnet-spoke', icon: 'virtual-networks', stroke: BLUE, sublabel: 'peered to hub' });
  d.icon('private-endpoints', 935, 140);
  d.lines(935, 182, [['Private endpoint', { weight: 600 }], '10.2.1.5']);

  // Zone
  d.box(390, 420, 410, 100, {
    label: 'Private DNS zone',
    icon: 'dns-zones',
    fill: '#faf9f8',
    sublabel: 'Linked to vnet-hub',
  });
  d.text(410, 488, 'privatelink.blob.core.windows.net', { size: 11, anchor: 'start', mono: true });
  d.text(410, 506, 'A   mystorage → 10.2.1.5', { size: 11, anchor: 'start', mono: true });
  d.step(660, 395, 5);

  // Data path
  d.arrow(
    [
      [80, 206],
      [80, 560],
      [935, 560],
      [935, 210],
    ],
    { width: 2 }
  );
  d.step(500, 560, 6);
  d.text(520, 580, 'Client connects to 10.2.1.5 over VPN / ExpressRoute', { size: 11, anchor: 'start' });

  // Legend
  d.add(`<path d="M150 400 L190 400" stroke="${SUB}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  d.text(200, 404, 'DNS query', { size: 11, color: SUB, anchor: 'start' });
  d.add(`<path d="M150 425 L190 425" stroke="${LINE}" stroke-width="2"/>`);
  d.text(200, 429, 'Traffic', { size: 11, color: SUB, anchor: 'start' });

  return d.toSvg();
}

const DIAGRAMS: Array<{ file: string; render: () => string }> = [
  { file: 'private-vs-service-endpoints/service-endpoint-flow.svg', render: serviceEndpointFlow },
  { file: 'private-vs-service-endpoints/private-endpoint-flow.svg', render: privateEndpointFlow },
  { file: 'private-endpoint-dns/dns-split-horizon.svg', render: dnsSplitHorizon },
  { file: 'private-endpoint-dns/dns-hub-spoke.svg', render: dnsHubSpoke },
  { file: 'private-endpoint-dns/dns-hybrid-flow.svg', render: dnsHybridFlow },
];

function main(): void {
  if (!fs.existsSync(ICONS_DIR)) {
    throw new Error(`Azure icons not found at ${ICONS_DIR}. Run npm install first.`);
  }

  for (const { file, render } of DIAGRAMS) {
    const outputPath = path.join(PUBLIC_GUIDES_DIR, file);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, render());
    console.log(`Wrote public/guides/${file}`);
  }
}

main();
