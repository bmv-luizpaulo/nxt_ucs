import { runImportForConfig } from './core/importEngine';
import { configs } from './mappings/blocked_ucs.mapping';

async function main() {
  for (const config of configs) {
    await runImportForConfig(config);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
