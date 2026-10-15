/* ============================================================
   App 5 — IP Subnet & Network Calculator
   ============================================================ */
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

let REFERENCE = [];

/* ------------------------------------------------------------
   IPv4 helpers — all arithmetic done with unsigned 32-bit ints
   ------------------------------------------------------------ */
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) throw new Error('An IPv4 address must have 4 octets.');
  parts.forEach((p) => {
    if (!Number.isInteger(p) || p < 0 || p > 255) {
      throw new Error('Each octet must be a whole number from 0 to 255.');
    }
  });
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
}

function intToBinary(int) {
  return int.toString(2).padStart(32, '0').match(/.{8}/g).join('.');
}

function maskFromCidr(cidr) {
  if (cidr === 0) return 0;
  return (0xFFFFFFFF << (32 - cidr)) >>> 0;
}

function classify(ip) {
  const first = Number(ip.split('.')[0]);
  if (first >= 1 && first <= 126) return 'Class A';
  if (first === 127) return 'Loopback';
  if (first >= 128 && first <= 191) return 'Class B';
  if (first >= 192 && first <= 223) return 'Class C';
  if (first >= 224 && first <= 239) return 'Class D (Multicast)';
  return 'Class E (Experimental)';
}

function isPrivate(ip) {
  const n = ipToInt(ip);
  const inRange = (start, end) => n >= ipToInt(start) && n <= ipToInt(end);
  return (
    inRange('10.0.0.0', '10.255.255.255') ||
    inRange('172.16.0.0', '172.31.255.255') ||
    inRange('192.168.0.0', '192.168.255.255')
  );
}

/* ------------------------------------------------------------
   Core calculation
   ------------------------------------------------------------ */
function calculate(raw) {
  const input = raw.trim();
  if (!input) throw new Error('Please enter an IP address.');

  const match = input.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*(?:\/\s*(\d{1,2}))?$/);
  if (!match) throw new Error('Format must look like 192.168.1.10/24');

  const ip = match[1];
  const cidr = match[2] !== undefined ? Number(match[2]) : 24;

  if (cidr < 0 || cidr > 32) throw new Error('CIDR must be between 0 and 32.');

  const ipInt   = ipToInt(ip);
  const maskInt = maskFromCidr(cidr);
  const wildInt = (~maskInt) >>> 0;

  const networkInt   = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildInt) >>> 0;

  const totalHosts = Math.pow(2, 32 - cidr);

  // /31 and /32 have special rules
  let usableHosts, firstHost, lastHost, rangeText;
  if (cidr === 32) {
    usableHosts = 1;
    firstHost = lastHost = intToIp(networkInt);
    rangeText = firstHost;
  } else if (cidr === 31) {
    usableHosts = 2;
    firstHost = intToIp(networkInt);
    lastHost  = intToIp(broadcastInt);
    rangeText = `${firstHost} — ${lastHost}`;
  } else {
    usableHosts = Math.max(totalHosts - 2, 0);
    firstHost = intToIp(networkInt + 1);
    lastHost  = intToIp(broadcastInt - 1);
    rangeText = `${firstHost} — ${lastHost}`;
  }

  return {
    ip,
    cidr,
    network:   intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    mask:      intToIp(maskInt),
    wildcard:  intToIp(wildInt),
    binary:    intToBinary(maskInt),
    totalHosts,
    usableHosts,
    rangeText,
    addressClass: classify(ip),
    type: isPrivate(ip) ? 'Private' : (ip.startsWith('127.') ? 'Loopback' : 'Public'),
    cidrNotation: `${intToIp(networkInt)}/${cidr}`
  };
}

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */
function render(r) {
  $('#rNetwork').textContent   = r.network;
  $('#rBroadcast').textContent = r.broadcast;
  $('#rMask').textContent      = r.mask;
  $('#rWildcard').textContent  = r.wildcard;
  $('#rRange').textContent     = r.rangeText;
  $('#rHosts').textContent     = `${r.totalHosts.toLocaleString()} / ${r.usableHosts.toLocaleString()}`;
  $('#rCidr').textContent      = r.cidrNotation;
  $('#rClass').textContent     = r.addressClass;
  $('#rType').textContent      = r.type;
  $('#rBinary').textContent    = r.binary;

  $('#results').hidden = false;
  $('#err').hidden = true;

  // Highlight the matching row in the reference table
  $$('#refBody tr').forEach((tr) => {
    tr.classList.toggle('active-row', Number(tr.dataset.cidr) === r.cidr);
  });
}

function showError(message) {
  const box = $('#err');
  box.textContent = '✖ ' + message;
  box.hidden = false;
  $('#results').hidden = true;
}

function run() {
  try {
    render(calculate($('#ipInput').value));
  } catch (err) {
    showError(err.message);
  }
}

/* ------------------------------------------------------------
   Quick-fill buttons
   ------------------------------------------------------------ */
function renderQuick(examples) {
  const box = $('#quick');
  box.innerHTML = examples
    .map((e) => `<button type="button">${e}</button>`)
    .join('');

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    $('#ipInput').value = btn.textContent;
    run();
  });
}

/* ------------------------------------------------------------
   CIDR reference table
   ------------------------------------------------------------ */
function renderReference(table) {
  $('#refBody').innerHTML = table.map((row) => `
    <tr data-cidr="${row.cidr}">
      <td>/${row.cidr}</td>
      <td>${row.mask}</td>
      <td>${row.total.toLocaleString()}</td>
      <td>${row.usable.toLocaleString()}</td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    REFERENCE = data.cidrTable || [];
    renderReference(REFERENCE);
    renderQuick(data.examples || []);
    $('#ipInput').value = (data.examples && data.examples[0]) || '192.168.1.10/24';
    run();
  } catch (err) {
    console.error('[app5] data.json failed:', err);
    renderQuick(['192.168.1.10/24', '10.0.0.1/8', '172.16.5.20/20']);
    $('#ipInput').value = '192.168.1.10/24';
    run();
  }
}

$('#calcBtn').addEventListener('click', run);
$('#ipInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') run();
});
$('#ipInput').addEventListener('input', run);

init();