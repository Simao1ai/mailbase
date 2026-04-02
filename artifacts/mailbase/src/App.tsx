import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BusinessProvider } from "@/lib/business-context";
import { Layout } from "@/components/layout";

import Overview from "@/pages/overview";
import Domains from "@/pages/domains";
import Campaigns from "@/pages/campaigns";
import Contacts from "@/pages/contacts";
import Analytics from "@/pages/analytics";
import Transactional from "@/pages/transactional";
import Settings from "@/pages/settings";
import Tenants from "@/pages/tenants";
import Inbox from "@/pages/inbox";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/domains" component={Domains} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/transactional" component={Transactional} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
        </BusinessProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
