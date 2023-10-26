// @ts-check
import { execa } from 'execa';
import path from 'node:path';

const directory = process.argv[2] ?? process.cwd();
console.log(`Running in ${path.resolve(directory)}`);

const packageInfo = await execa('yarn', ['info', '-R', '--json'], {
  cwd: directory,
});
const lines = packageInfo.stdout.split('\n');
const parsedLines = lines.map((line) => JSON.parse(line));
const packages = parsedLines
  .filter((line) => line.value.includes('@npm:'))
  .map((line) => {
    // Value is something like `@foo/bar@npm:4` or `foo@npm:4`. We need to
    // extract the package name from this.
    const [name, version] = line.value.split('@npm:');
    const dependencies =
      line.children.Dependencies?.map((dependency) => {
        const [name, version] = dependency.descriptor.split('@npm:');
        return { name, version };
      }) ?? [];
    return { name, version, dependencies };
  });

const packageVersions = new Map();
packages.forEach((pkg) => {
  let versions = packageVersions.get(pkg.name);
  if (!versions) {
    versions = [];
    packageVersions.set(pkg.name, versions);
  }
  versions.push(pkg.version);
});

const packageNames = Array.from(packageVersions.keys()).sort();

for (const packageName of packageNames) {
  const versions = packageVersions.get(packageName);
  if (versions.length <= 1) continue;

  console.log(`${packageName}: ${versions.join(', ')}`);
}
