import CountdownTimer from '../CountdownTimer'

export default function CountdownTimerExample() {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 7)
  
  return <CountdownTimer targetDate={targetDate} />
}
