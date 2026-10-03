// Zips dist-itch/ into itch.zip, ready to upload to itch.io ("HTML" project, "played in the browser").
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { join, relative } from "path"
import { zipSync } from "fflate"

const root = "dist-itch"
const files: Record<string, Uint8Array> = {}
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else files[relative(root, full).split("\\").join("/")] = readFileSync(full)
  }
}
walk(root)
writeFileSync("itch.zip", zipSync(files))
console.log(`itch.zip written (${Object.keys(files).length} files)`)
