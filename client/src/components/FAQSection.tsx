import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQSection() {
  const faqs = [
    {
      question: "Who is eligible to vote?",
      answer: "All registered students in good standing are eligible to vote. You must verify your student email to access the voting portal.",
    },
    {
      question: "When does voting open?",
      answer: "Voting opens on the date specified in the countdown timer on the home page. You'll receive an email notification when voting begins.",
    },
    {
      question: "Can I change my vote after submission?",
      answer: "No, votes are final once submitted. Please review your selections carefully before confirming.",
    },
    {
      question: "How is my vote kept secure?",
      answer: "We use industry-standard encryption and security measures. Your vote is anonymous and cannot be traced back to your identity.",
    },
    {
      question: "What if I encounter technical issues?",
      answer: "Contact our support team using the contact form or email elections@dept.edu.gh for immediate assistance.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Frequently Asked Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left" data-testid={`accordion-trigger-${index}`}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed" data-testid={`accordion-content-${index}`}>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
