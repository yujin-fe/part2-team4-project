import "../components/Loading.scss";
// ✅ 로딩 화면 컴포넌트
const LoadingScreen = () => (
  <div className="loading-container">
    <div className="spinner" />
    <div className="loading-text txt-16">메시지를 불러오는 중...</div>
  </div>
);

export default LoadingScreen;
