/** Brand block of the login screen: logo mark, name and tagline (from the Figma design). */
export function LoginHeader() {
  return (
    <header className="flex flex-col items-center text-center">
      <div aria-hidden="true" className="size-14 rounded-2xl bg-primary" />
      <h1 className="mt-5 text-[32px] leading-tight font-semibold wrap-anywhere text-primary">
        GranaBank
      </h1>
      <p className="mt-3 text-sm text-muted">
        Con cada compra, sumás orgullo granate
      </p>
    </header>
  );
}
