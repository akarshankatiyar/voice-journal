import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Home from "./pages/Home";
import TodaysText from "./pages/TodaysText";
import AcademicNotes from "./pages/AcademicNotes";
import MeetingNotes from "./pages/MeetingNotes";
import AllConversations from "./pages/AllConversations";
import TasksReminders from "./pages/TasksReminders";
import IdeasVault from "./pages/IdeasVault";
import PeopleContacts from "./pages/PeopleContacts";
import HealthLog from "./pages/HealthLog";
import ShoppingList from "./pages/ShoppingList";
import YouTubeNotes from "./pages/YouTubeNotes";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import SharedNote from "./pages/SharedNote";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/shared/:token" element={<SharedNote />} />
          
          {/* App routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/todays-text" element={<TodaysText />} />
            <Route path="/academic-notes" element={<AcademicNotes />} />
            <Route path="/youtube-notes" element={<YouTubeNotes />} />
            <Route path="/meeting-notes" element={<MeetingNotes />} />
            <Route path="/conversations" element={<AllConversations />} />
            <Route path="/tasks" element={<TasksReminders />} />
            <Route path="/ideas" element={<IdeasVault />} />
            <Route path="/people" element={<PeopleContacts />} />
            <Route path="/health" element={<HealthLog />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
