
import { RecoilRoot } from 'recoil';
import './App.css';
import TopBar from './components/topbar/TopBar';
import Desktop from './components/applications/Desktop';

function App() {
  return (
    <RecoilRoot>
        <div className="App">
          <TopBar />
          <Desktop />
        </div>
    </RecoilRoot>
  );
}
 
export default App;
