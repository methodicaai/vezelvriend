// Each company document as a plain text file, to download and put in your own AI.
import { getDocuments } from '../../../../documents';

export function getStaticPaths() {
  return getDocuments().map((d) => ({ params: { slug: d.slug }, props: { text: d.text } }));
}

export function GET({ props }: { props: { text: string } }) {
  return new Response(props.text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
