export interface DPIPreset {
  name: string;
  dpi: number;
  description: string;
  typical_printers: string[];
}

export const DPI_PRESETS: Record<string, DPIPreset> = {
  STANDARD: {
    name: 'Standard',
    dpi: 203,
    description: 'Standard thermal printer resolution',
    typical_printers: ['Zebra GK420d', 'Zebra ZD410', 'DYMO LabelWriter 450']
  },
  HIGH: {
    name: 'High Resolution',
    dpi: 300,
    description: 'High resolution thermal printer',
    typical_printers: ['Zebra GK420t', 'Zebra ZD420', 'Brother QL-800']
  },
  VERY_HIGH: {
    name: 'Very High Resolution',
    dpi: 600,
    description: 'Very high resolution printer',
    typical_printers: ['Zebra ZT410', 'Zebra ZT610', 'TSC TTP-247']
  },
  SCREEN: {
    name: 'Screen DPI',
    dpi: 96,
    description: 'Standard screen resolution (for testing)',
    typical_printers: ['Computer Monitor', 'Debug Preview']
  }
};

export function getDPIPreset(dpi: number): DPIPreset | null {
  for (const preset of Object.values(DPI_PRESETS)) {
    if (preset.dpi === dpi) {
      return preset;
    }
  }
  return null;
}

export function listDPIPresets(): void {
  console.log('\nAvailable DPI Presets:');
  console.log('=====================');
  
  for (const [key, preset] of Object.entries(DPI_PRESETS)) {
    console.log(`${key}: ${preset.dpi} DPI - ${preset.description}`);
    console.log(`  Typical printers: ${preset.typical_printers.join(', ')}`);
    console.log('');
  }
}

export function calculateScaleFactor(fromDPI: number, toDPI: number): number {
  return toDPI / fromDPI;
}

export function recommendedFontSize(baseFontSize: number, targetDPI: number): number {
  const scaleFactor = calculateScaleFactor(96, targetDPI); // 96 is standard screen DPI
  return Math.round(baseFontSize * scaleFactor);
}
