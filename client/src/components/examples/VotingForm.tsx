import VotingForm from '../VotingForm'
import candidate1 from '@assets/generated_images/Male_candidate_headshot_1_42ad3b40.png'
import candidate2 from '@assets/generated_images/Female_candidate_headshot_1_cd2490c7.png'

export default function VotingFormExample() {
  const positions = [
    {
      id: 'president',
      title: 'President',
      candidates: [
        {
          id: 'c1',
          name: 'Kwame Mensah',
          photoUrl: candidate1,
          manifesto: 'Committed to improving student welfare and academic resources.'
        },
        {
          id: 'c2',
          name: 'Ama Asante',
          photoUrl: candidate2,
          manifesto: 'Focused on transparency and inclusive governance.'
        }
      ]
    }
  ]

  return <VotingForm positions={positions} onSubmit={(votes) => console.log('Votes:', votes)} />
}
