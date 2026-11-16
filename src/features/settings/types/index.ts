export type Settings = {
  mode: string;
  targetStatus: string;
  queue: string;
  timezone: string;
  accurate: {
    mode: 'simulation' | 'live';
    taxPolicy: 'gross-no-tax';
    hasApiToken: boolean;
    hasSignatureSecret: boolean;
  };
  connections: { id: string; enabled: boolean; hasSecret: boolean; updatedAt: string }[];
};
