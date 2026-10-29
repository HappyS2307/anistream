export function SearchForm({ query }: { query: string }) {
  return (
    <form className="search-form" action="/search" method="get" role="search">
      <label htmlFor="catalogue-search">
        Search title names, categories, and descriptions
      </label>
      <div className="search-form__controls">
        <input
          id="catalogue-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Try a title or a story detail"
          autoComplete="off"
        />
        <button className="button button--primary" type="submit">
          Search <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}