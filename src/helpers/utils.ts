export function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(address.length - 4, address.length)}`;
}

export function sanitizeAccountAddress(addr: string) {
  return `0x${('0'.repeat(40) + addr.toLowerCase()).slice(-40)}`;
}
