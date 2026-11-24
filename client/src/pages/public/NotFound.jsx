import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../../components/ui/index.jsx';

export default function NotFound({ what = 'page' }) {
  return (
    <EmptyState
      icon={Compass}
      title={`This ${what} doesn't exist`}
      className="mx-auto mt-10 max-w-md"
      action={
        <Button as={Link} to="/" variant="secondary">
          Back home
        </Button>
      }
    >
      It may have been moved, made private, or the link is mistyped.
    </EmptyState>
  );
}
