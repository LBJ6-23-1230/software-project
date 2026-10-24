// Original vector illustrations for fictional demo listings. No remote image dependency.
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("public/assets", { recursive: true });
const svg = (bg, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="${bg}"/><ellipse cx="300" cy="324" rx="118" ry="17" fill="#233638" opacity=".07"/>${content}</svg>`;
const art = {
  umbrella: svg(
    "#e8ede9",
    `<path d="M304 106v181q0 36-29 36t-29-29" fill="none" stroke="#c49a6a" stroke-width="13" stroke-linecap="round"/><path d="M137 183a164 125 0 0 1 328 0q-32-23-65 0-32-23-65 0-32-23-65 0-32-23-65 0-34-23-68 0" fill="#326c5e"/><path d="M304 61q-60 53-66 117m66-117q61 53 66 117" fill="none" stroke="#d2e6d9" stroke-width="3" opacity=".55"/><path d="M304 49v14" stroke="#284e45" stroke-width="7" stroke-linecap="round"/>`,
  ),
  card: svg(
    "#ecedf4",
    `<g transform="rotate(-10 300 200)"><rect x="156" y="103" width="288" height="179" rx="13" fill="#fff" stroke="#d5d9df"/><path d="M169 103h262q13 0 13 13v45H156v-45q0-13 13-13" fill="#315987"/><circle cx="187" cy="132" r="13" fill="none" stroke="#cddded" stroke-width="3"/><path d="M181 132l5 5 8-10" fill="none" stroke="#cddded" stroke-width="3"/><rect x="213" y="127" width="120" height="10" rx="3" fill="#e7eef5"/><rect x="182" y="182" width="59" height="71" rx="5" fill="#e4eaf0"/><circle cx="212" cy="206" r="12" fill="#a9baca"/><path d="M191 242q0-27 21-27t21 27" fill="#a9baca"/><path d="M263 193h133m-133 22h95m-95 22h108" stroke="#d7dde5" stroke-width="8" stroke-linecap="round"/></g>`,
  ),
  headphones: svg(
    "#f0ebe5",
    `<g transform="rotate(-12 300 200)"><rect x="224" y="179" width="157" height="113" rx="37" fill="#fdfdfb" stroke="#d5d2cb" stroke-width="2"/><path d="M225 220h154" stroke="#ddd9d1" stroke-width="2"/><circle cx="302" cy="250" r="3" fill="#98ae86"/><g fill="#fff" stroke="#d1cec8" stroke-width="2"><path d="M221 105q-30 0-30 29t30 29h13v56q0 14 14 14t14-14v-96q0-18-41-18"/><path d="M369 93q30 0 30 29t-30 29h-13v56q0 14-14 14t-14-14v-96q0-18 41-18"/></g><ellipse cx="218" cy="133" rx="9" ry="15" fill="#535a5d"/><ellipse cx="372" cy="121" rx="9" ry="15" fill="#535a5d"/></g>`,
  ),
  bottle: svg(
    "#e5edf1",
    `<g transform="rotate(9 300 200)"><rect x="259" y="73" width="82" height="32" rx="9" fill="#606b7d"/><rect x="246" y="102" width="108" height="212" rx="30" fill="#a0bdce"/><path d="M261 129v145" stroke="#d0e1e8" stroke-width="9" stroke-linecap="round"/><path d="M247 256h106" stroke="#7a9cac" stroke-width="3"/><rect x="272" y="182" width="58" height="34" rx="4" fill="#e5eff3" opacity=".8"/></g>`,
  ),
  book: svg(
    "#f1ece2",
    `<g transform="rotate(-13 300 200)"><path d="M210 88h175v223H210q-24 0-24-21V109q0-21 24-21" fill="#c67a57"/><path d="M210 88v222" stroke="#a95f40" stroke-width="4"/><path d="M210 310h175v-12H210q-12 0-12-8" fill="#f9f2e4"/><rect x="237" y="121" width="117" height="84" rx="2" fill="#e8c79d"/><path d="M255 144h81m-81 20h60m-60 20h70" stroke="#9c6d4b" stroke-width="6"/><path d="M243 240h100m-100 15h70" stroke="#e7c2a7" stroke-width="4"/><path d="M349 88v47l-12-9-12 9V88" fill="#f1d6af"/></g>`,
  ),
  keys: svg(
    "#e9e7e1",
    `<circle cx="292" cy="134" r="47" stroke="#929b9f" stroke-width="8" fill="none"/><g transform="rotate(25 300 210)"><path d="M256 164a27 27 0 1 1 49 14v113h-22v-16h-18v-20h18v-77" fill="#c9ad72" stroke="#ad925d" stroke-width="3"/><circle cx="280" cy="153" r="11" fill="#e9e7e1"/></g><g transform="rotate(-18 310 220)"><path d="M312 160a24 24 0 1 1 44 16v112h-23v-20h-17v-17h17v-75" fill="#bbc3c4" stroke="#8d999d" stroke-width="3"/><circle cx="334" cy="153" r="10" fill="#e9e7e1"/></g><rect x="228" y="151" width="49" height="77" rx="12" fill="#698b70" transform="rotate(19 250 190)"/>`,
  ),
  bag: svg(
    "#eee6df",
    `<path d="M260 108V91q40-38 80 0v17" fill="none" stroke="#88664f" stroke-width="13"/><path d="M235 109q65-26 130 0l19 198H216z" fill="#a77f62"/><path d="M235 113q-31 66-29 146m158-146q30 66 29 146" fill="none" stroke="#8a6851" stroke-width="13"/><path d="M233 166h133" stroke="#6a5041" stroke-width="5"/><rect x="241" y="206" width="119" height="82" rx="12" fill="#b79375" stroke="#987251" stroke-width="2"/><path d="M253 228h94" stroke="#7d604c" stroke-width="4"/><rect x="280" y="139" width="39" height="17" rx="4" fill="#ddc4a5"/>`,
  ),
  watch: svg(
    "#e8eae9",
    `<path d="M271 51h59l14 100v100l-14 100h-59l-14-100V151z" fill="#435c59"/><rect x="244" y="135" width="112" height="130" rx="28" fill="#b7c0bd"/><rect x="251" y="142" width="98" height="116" rx="23" fill="#213d3a"/><circle cx="300" cy="200" r="35" fill="none" stroke="#9eb7a6" stroke-width="3"/><path d="M300 174v26l18 14" fill="none" stroke="#dae7d8" stroke-width="5" stroke-linecap="round"/><rect x="356" y="174" width="7" height="17" rx="3" fill="#9aa5a2"/>`,
  ),
};
for (const [name, content] of Object.entries(art))
  writeFileSync(`public/assets/${name}.svg`, content);
writeFileSync(
  "public/assets/logo.svg",
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#136b58"/><path d="M14 27V16h11a9 9 0 0 1 0 18H14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M8 25h20m-5-5 5 5-5 5" fill="none" stroke="#d2e4a9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
);
