import {
  readdirSync,
  statSync,
  readFileSync,
  existsSync,
  writeFileSync
} from 'fs';
import { join } from 'path';
import { start } from 'repl';

type Package = string | [string, [string]];
type Packages = [] | [Package];

const angularPackages: any = [];

const defaultPeerDeps = new Set(['rxjs', 'zone.js']);

const hasMetadata = (dir: string): boolean => {
  const dirContent = readdirSync(dir);
  if (dirContent.filter(d => d.includes('metadata.json')).length > 0) {
    return true;
  }
  return dirContent.some(d => {
    if (d.startsWith('.')) return false;
    if (d === 'node_modules') return false;
    if (statSync(join(dir, d)).isDirectory()) {
      return hasMetadata(join(dir, d));
    }
    return false;
  });
};

const findAngularPackages = (startDir: string) => {
  if (!existsSync(startDir)) {
    return;
  }
  const dirContent = readdirSync(startDir).filter(dir => !dir.startsWith('.'));
  if (!dirContent.includes('package.json')) {
    dirContent
      .filter(c => {
        let dir = false;
        try {
          dir = statSync(join(startDir, c)).isDirectory();
        } catch {}
        return dir;
      })
      .forEach(c => findAngularPackages(join(startDir, c)));
    return;
  }
  const pkg = JSON.parse(
    readFileSync(join(startDir, 'package.json')).toString()
  );
  const packageName = pkg.name;
  const packageVersion = pkg.version;
  const peerDeps = Object.keys(pkg.peerDependencies || {})
    .filter((key: string) => {
      if (defaultPeerDeps.has(key)) return false;
      if (key.startsWith('@angular/')) return false;
      return true;
    })
    .map((p: string) => {
      return {
        name: p,
        version: pkg.peerDependencies[p]
      };
    });
  if (hasMetadata(startDir)) {
    console.log('+', packageName);
    angularPackages.push({
      name: packageName,
      version: packageVersion,
      deps: peerDeps
    });
  } else {
    console.log('-', packageName);
  }
  dirContent.forEach(p => {
    if (p === 'node_modules') {
      readdirSync(join(startDir, p)).forEach(c => {
        findAngularPackages(join(startDir, p, c));
      });
    }
  });
};

findAngularPackages('.');

writeFileSync(
  'angular-packages.json',
  JSON.stringify(angularPackages, null, 2)
);
