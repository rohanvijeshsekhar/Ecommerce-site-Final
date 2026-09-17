import { Metadata } from 'next';
import { ContactPage } from '@/components/store/ContactPage';

export const metadata: Metadata = {
  title: 'Contact Us | FAAZO Dental Solutions',
  description:
    'Get in touch with FAAZO dental specialists for product inquiries, clinic setup consultations, equipment demonstrations, bulk pricing, and technical service support.',
};

export default function Page() {
  return <ContactPage />;
}
