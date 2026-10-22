// Generuje manifest winget dla bieżącej wersji: `npm run winget` po `npm run release`.
// Pliki trafiają do winget/manifests/p/Parallax373/Messy/<wersja>/; wysyła się je pull requestem
// do github.com/microsoft/winget-pkgs (np. `wingetcreate submit <katalog>`).
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {version} = require('../package.json');

const root = path.join(__dirname, '..');
const installer = path.join(root, 'release', `Messy-Setup-${version}.exe`);
if (!fs.existsSync(installer)) {
	console.error(`Brak ${installer}. Najpierw zbuduj albo wydaj wersję ${version}.`);
	process.exit(1);
}

const sha256 = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex').toUpperCase();
const id = 'Parallax373.Messy';
const schema = 'https://aka.ms/winget-manifest';
const manifestVersion = '1.6.0';
const dir = path.join(root, 'winget', 'manifests', 'p', 'Parallax373', 'Messy', version);
fs.mkdirSync(dir, {recursive: true});

const files = {
	[`${id}.yaml`]: `# yaml-language-server: $schema=${schema}.version.${manifestVersion}.schema.json
PackageIdentifier: ${id}
PackageVersion: ${version}
DefaultLocale: en-US
ManifestType: version
ManifestVersion: ${manifestVersion}
`,
	[`${id}.installer.yaml`]: `# yaml-language-server: $schema=${schema}.installer.${manifestVersion}.schema.json
PackageIdentifier: ${id}
PackageVersion: ${version}
InstallerType: nullsoft
Scope: user
InstallModes:
- silent
UpgradeBehavior: install
Installers:
- Architecture: x64
  InstallerUrl: https://github.com/Parallax373/messy/releases/download/v${version}/Messy-Setup-${version}.exe
  InstallerSha256: ${sha256}
ManifestType: installer
ManifestVersion: ${manifestVersion}
`,
	[`${id}.locale.en-US.yaml`]: `# yaml-language-server: $schema=${schema}.defaultLocale.${manifestVersion}.schema.json
PackageIdentifier: ${id}
PackageVersion: ${version}
PackageLocale: en-US
Publisher: Parallax373
PublisherUrl: https://github.com/Parallax373
PackageName: Messy
PackageUrl: https://github.com/Parallax373/messy
License: MIT
LicenseUrl: https://github.com/Parallax373/messy/blob/main/LICENSE
PrivacyUrl: https://github.com/Parallax373/messy/blob/main/PRIVACY.md
ShortDescription: Messenger in your Windows tray (unofficial, not affiliated with Meta).
Description: Messy shows facebook.com/messages in a compact panel above the Windows tray, with an unread-only tray badge, OLED mode and one-click mute.
Moniker: messy
Tags:
- chat
- facebook
- messenger
- tray
ReleaseNotesUrl: https://github.com/Parallax373/messy/releases/tag/v${version}
ManifestType: defaultLocale
ManifestVersion: ${manifestVersion}
`,
};

for (const [name, content] of Object.entries(files)) {
	fs.writeFileSync(path.join(dir, name), content);
}

console.log(`Manifest winget ${version}: ${dir}`);
