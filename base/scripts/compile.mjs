import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import solc from 'solc';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = {
  language: 'Solidity',
  sources: {
    'GreenAfrica.sol': { content: readFileSync(path.join(root, 'contracts/GreenAfrica.sol'), 'utf8') },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'shanghai',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};
const result = JSON.parse(solc.compile(JSON.stringify(input)));
for (const item of result.errors ?? []) {
  if (item.severity === 'error') console.error(item.formattedMessage);
}
if ((result.errors ?? []).some((e) => e.severity === 'error')) process.exit(1);
const contract = result.contracts?.['GreenAfrica.sol']?.GreenAfrica;
if (!contract?.evm?.bytecode?.object) throw new Error('No compiled contract artifact');
const directory = path.join(root, 'artifacts');
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, 'GreenAfrica.json'), JSON.stringify({
  contractName: 'GreenAfrica',
  compiler: solc.version(),
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
  deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
}, null, 2));
console.log('Compiled GreenAfrica (' + solc.version() + ')');
