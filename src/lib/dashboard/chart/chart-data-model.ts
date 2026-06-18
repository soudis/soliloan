export type ChartDataset = {
  id: string;
  label: string;
  values: (number | null)[];
};

export type ChartDataModel = {
  labels: string[];
  datasets: ChartDataset[];
};
