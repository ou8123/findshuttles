import SearchForm from '@/components/SearchForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-3xl">
        <SearchForm />
      </div>
    </main>
  );
}
