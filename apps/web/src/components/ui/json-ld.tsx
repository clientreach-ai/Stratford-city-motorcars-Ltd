/**
 * Emits a JSON-LD block. Kept as a component so every page declares its
 * structured data next to the content it describes.
 *
 * The payload is our own, never user input, so serialising it directly is
 * safe. `<` is still escaped to close off any chance of breaking out of the
 * script element if a vehicle description ever contains markup.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- serialised, escaped, first-party data
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
