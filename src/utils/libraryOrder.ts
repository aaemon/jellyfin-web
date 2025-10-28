// Utility to get and set config.json for global library order settings
import config from '../config.json';

export function getLibraryOrder(): string[] {
  return config.libraryOrder || [];
}

export function setLibraryOrder(order: string[]): void {
  config.libraryOrder = order;
  // In a real app, you would persist this to disk or server
}
