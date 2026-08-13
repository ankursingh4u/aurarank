/**
 * Renders a schema.org JSON-LD document into the page.
 *
 * The payload is built server-side from our own data, never from user input, so
 * dangerouslySetInnerHTML is safe here. `<` is still escaped because a literal
 * `</script>` inside a JSON string would otherwise close the tag early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
