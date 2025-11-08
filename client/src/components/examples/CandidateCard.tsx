import CandidateCard from '../CandidateCard'
import candidatePhoto from '@assets/generated_images/Male_candidate_headshot_1_42ad3b40.png'

export default function CandidateCardExample() {
  return (
    <CandidateCard
      id="1"
      name="Kwame Mensah"
      position="President"
      photoUrl={candidatePhoto}
      manifestoSnippet="I am committed to improving student welfare, enhancing academic resources, and creating a more inclusive department for all students."
    />
  )
}
