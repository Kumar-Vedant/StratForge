import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import Planning from './pages/Planning';
import Roadmap from './pages/Roadmap';
import './App.css';

function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/create" element={<CreateProject />} />
          <Route path="/projects/:projectId/plan" element={<Planning />} />
          <Route path="/projects/:projectId/roadmap" element={<Roadmap />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
