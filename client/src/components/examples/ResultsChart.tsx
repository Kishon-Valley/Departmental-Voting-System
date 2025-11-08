import ResultsChart from '../ResultsChart'

export default function ResultsChartExample() {
  const candidates = [
    { id: 'c1', name: 'Kwame Mensah', votes: 450, percentage: 55 },
    { id: 'c2', name: 'Ama Asante', votes: 320, percentage: 39 },
    { id: 'c3', name: 'Kofi Adjei', votes: 50, percentage: 6 }
  ]

  return <ResultsChart positionTitle="President" candidates={candidates} />
}
