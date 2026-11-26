import "server-only";

import fs from "fs/promises";
import type { PackageJson } from "type-fest";

type VersionNumeral = string | number;

export type VersionText =
  `${VersionNumeral}.${VersionNumeral}.${VersionNumeral}`;

export interface AppVersion {
  version?: VersionText;
}

let _packageJsonCache: PackageJson | null = null;

export async function readPackageJson(): Promise<PackageJson | null> {
  if (_packageJsonCache !== null) {
    return _packageJsonCache;
  }

  const packageJsonRaw = await fs.readFile("./package.json");

  const packageJsonString = packageJsonRaw.toString();

  const packageJson = JSON.parse(packageJsonString) as PackageJson;

  _packageJsonCache = packageJson;

  return packageJson;
}

export async function readAppVersion(): Promise<VersionText | undefined> {
  const packageJson = await readPackageJson();

  return packageJson?.version as VersionText | undefined;
}
