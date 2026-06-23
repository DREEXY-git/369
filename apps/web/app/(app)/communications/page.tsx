import { redirect } from 'next/navigation';

export default function CommunicationsIndex() {
  redirect('/communications/inbox');
}
