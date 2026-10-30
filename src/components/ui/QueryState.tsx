import { ErrorMessage, Loading } from '../Feedback'
import { getErrorMessage } from '../../api/client'
import { Button } from './Button'

export function QueryError({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="space-y-3"><ErrorMessage message={getErrorMessage(error)} /><Button onClick={retry}>Reintentar</Button></div>
}
export { Loading }
