import AppSidebar from "@/components/AppSidebar";


export default async function AppShell({ children }: { children: React.ReactNode }) {
  return (
      <div
        className="flex min-h-screen"
        style={{ backgroundColor: "var(--bg-default)" }}
      >
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full flex-1 ">
            {children}
          </main>

          <footer
            className="border-t py-2.5 text-center text-muted-foreground"
            style={{
              backgroundColor: "var(--bg-footer)",
              borderColor: "var(--divider)",
            }}
          >
            <p className="text-xs">
              Deadlock France
            </p>
          </footer>
        </div>

      </div>
  );
}
