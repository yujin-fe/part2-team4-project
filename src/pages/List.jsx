import "./List.scss";
import { useEffect, useState, lazy } from "react";
import { Link } from "react-router-dom";

import { getBackgroundData } from "../api/images";
import { getMessages } from "../api/message";
import { getCards, getReactions } from "../api/recipients";
import Button from "../components/Button";
// import Listcard from "../components/Listcard";
const Listcard = lazy(() => import("../components/Listcard"));

import list_arrow from "./../assets/imgs/list_arrow.svg";

const List = () => {
  const [popularCard, setPopularCard] = useState([]);
  const [recentCard, setRecentCard] = useState([]);
  const [profileImages, setProfileImages] = useState({});
  const [backgrounds, setBackgrounds] = useState({});
  const [reactions, setReactions] = useState({});
  const [popularOffset, setPopularOffset] = useState(0);
  const [recentOffset, setRecentOffset] = useState(0);
  const [popularTotal, setPopularTotal] = useState(0);
  const [recentTotal, setRecentTotal] = useState(0);

  const limit = 4;

  /** 화면 폭 감지 (리사이즈 대응) */
  const [isSmall, setIsSmall] = useState(() => window.innerWidth <= 1200);
  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth <= 1200);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** 작은 화면에서 “전체 데이터” 보장용 페이징 fetcher */
  const fetchAllCards = async ({ sort, pageSize = 50 }) => {
    let offset = 0;
    let all = [];
    while (true) {
      const { results = [], count = 0 } = await getCards(
        pageSize,
        offset,
        sort
      );
      all = all.concat(results);
      if (results.length < pageSize) {
        return { results: all, count };
      }
      offset += pageSize;
      // 안전장치 (혹시 서버 count가 불안정할 때)
      if (all.length >= count && count > 0) {
        return { results: all.slice(0, count), count };
      }
      // 비정상 루프 방지
      if (offset > 5000) {
        return { results: all, count: Math.max(count, all.length) };
      }
    }
  };

  /**  인기 카드 */
  useEffect(() => {
    (async () => {
      try {
        if (isSmall) {
          // ≤1200 : 인기 전체 로드(“like” 정렬)
          const { results, count } = await fetchAllCards({ sort: "like" });
          setPopularCard(results);
          setPopularTotal(count);
        } else {
          // >1200 : 4개 페이징
          const { results, count } = await getCards(
            limit,
            popularOffset,
            "like"
          );
          setPopularCard(results);
          setPopularTotal(count);
        }
      } catch (error) {
        console.error("🔥 인기 카드 불러오기 실패:", error);
      }
    })();
  }, [isSmall, popularOffset]);

  /**  최신 카드 */
  useEffect(() => {
    (async () => {
      try {
        if (isSmall) {
          // ≤1200 : 최신 전체 로드(기본 최신순)
          const { results, count } = await fetchAllCards({ sort: undefined });
          setRecentCard(results);
          setRecentTotal(count);
        } else {
          // >1200 : 4개 페이징
          const { results, count } = await getCards(limit, recentOffset);
          setRecentCard(results);
          setRecentTotal(count);
        }
      } catch (error) {
        console.error("🔥 최신 카드 불러오기 실패:", error);
      }
    })();
  }, [isSmall, recentOffset]);

  /**  중복 없는 카드만 추출 */
  const getUniqueCards = () => {
    const combined = [...popularCard, ...recentCard];
    return combined.filter(
      (card, index, self) => index === self.findIndex((c) => c.id === card.id)
    );
  };

  /**  카드별 프로필 + 배경 + 리액션 */
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const cards = getUniqueCards();
        const cardsToFetch = cards.filter(
          (c) => !profileImages[c.id] || !backgrounds[c.id] || !reactions[c.id]
        );

        await Promise.all(
          cardsToFetch.map(async (card) => {
            try {
              const messages = await getMessages(card.id);
              const messageArray = messages?.results ?? messages;
              const images = Array.isArray(messageArray)
                ? messageArray.map((msg) => msg.profileImageURL).filter(Boolean)
                : [];
              setProfileImages((prev) => ({ ...prev, [card.id]: images }));

              const bg = await getBackgroundData(card.id);
              setBackgrounds((prev) => ({ ...prev, [card.id]: bg }));

              const res = await getReactions({
                recipientId: card.id,
                limit: 3,
                offset: 0,
              });
              setReactions((prev) => ({
                ...prev,
                [card.id]: res?.results ?? [],
              }));
            } catch (err) {
              console.warn(
                `⚠️ 카드(${card.id}) 데이터 실패:`,
                err?.message || err
              );
            }
          })
        );
      } catch (error) {
        console.error("❌ 카드 세부 데이터 불러오기 실패:", error);
      }
    };

    fetchDetails();
  }, [popularCard, recentCard]);

  /** 페이지네이션 */
  const onClickNextPopular = () => setPopularOffset((p) => p + limit);
  const onClickPrevPopular = () =>
    setPopularOffset((p) => Math.max(p - limit, 0));
  const onClickNextRecent = () => setRecentOffset((p) => p + limit);
  const onClickPrevRecent = () =>
    setRecentOffset((p) => Math.max(p - limit, 0));

  /** 카드 리스트 렌더링 */
  const renderCardList = (cards) =>
    cards.map(({ id, ...rest }) => (
      <Link key={id} to={`/post/${id}`}>
        <Listcard
          {...rest}
          profileImages={profileImages[id] ?? []}
          reactions={reactions[id]}
          backgroundColor={backgrounds[id]?.backgroundColor}
          backgroundImageURL={backgrounds[id]?.backgroundImage}
        />
      </Link>
    ));

  /** 🎡 가로 스크롤 제어
   *  - ≤1200 : 컨테이너에서 가로 스크롤 활성(스크롤바 숨김). 휠 가속도 ↑(3.0)
   *  - >1200  : 가로 스크롤 완전 차단(overflow-x: hidden) → 버튼으로만 이동.
   */
  useEffect(() => {
    const popular = document.querySelector(".rolling_popular_card");
    const recent = document.querySelector(".rolling_recent_card");
    const sections = [popular, recent].filter(Boolean);

    const cleanups = [];
    if (sections.length === 0) return;

    if (isSmall) {
      sections.forEach((section) => {
        // 가로 스크롤 활성 및 스크롤바 숨김(브라우저별 처리)
        section.style.overflowX = "auto";
        section.style.overflowY = "hidden";
        section.style.scrollBehavior = "smooth";
        section.style.msOverflowStyle = "none"; // IE/Edge
        section.style.scrollbarWidth = "none"; // Firefox

        // WebKit 스크롤바 숨김 보강
        const styleEl = document.createElement("style");
        styleEl.textContent = `
          .rolling_popular_card::-webkit-scrollbar,
          .rolling_recent_card::-webkit-scrollbar { display: none; height: 0 !important; }
        `;
        document.head.appendChild(styleEl);
        cleanups.push(() => document.head.removeChild(styleEl));

        // 가로 휠 민감도 ↑ (3.0)
        const onWheel = (e) => {
          const canScroll = section.scrollWidth > section.clientWidth; // 실제 스크롤 가능할 때만
          if (!canScroll) return;

          // 컨테이너 위에서는 세로 스크롤을 가로로 소비
          e.preventDefault();
          section.scrollLeft += e.deltaY * 3.0; // 🔥 가속도 업
        };
        section.addEventListener("wheel", onWheel, { passive: false });
        cleanups.push(() => section.removeEventListener("wheel", onWheel));
      });
    } else {
      // 데스크탑 모드: 가로 스크롤 차단 + 남은 상태 초기화
      sections.forEach((section) => {
        // ✅ 모바일 때 준 inline 스타일들 원복
        section.style.overflowX = ""; // "auto" 해제
        section.style.overflowY = ""; // "hidden" 해제
        section.style.scrollBehavior = ""; // "smooth" 해제
        section.style.msOverflowStyle = ""; // IE/Edge 설정 해제
        section.style.scrollbarWidth = ""; // Firefox 설정 해제

        // ✅ 모바일에서 남아있는 가로 스크롤 위치 초기화(잘림 방지 핵심)
        section.scrollLeft = 0;
      });
    }

    return () => cleanups.forEach((fn) => fn && fn());
  }, [isSmall]);

  return (
    <div className="rolling_list">
      {/*  인기 롤링페이퍼 */}
      <div className="rolling_popular">
        <h3 className="txt-24-b">인기 롤링 페이퍼 🔥</h3>
        <div className="rolling_popular_card">
          {renderCardList(popularCard)}
          {popularOffset + limit < popularTotal && (
            <Button className="next_icon icon" onClick={onClickNextPopular}>
              <img src={list_arrow} alt="다음" />
            </Button>
          )}
          {popularOffset > 0 && (
            <Button className="prev_icon icon" onClick={onClickPrevPopular}>
              <img src={list_arrow} alt="이전" />
            </Button>
          )}
        </div>
      </div>

      {/* 최신 롤링페이퍼 */}
      <div className="rolling_recent">
        <h3 className="txt-24-b">최근에 만든 롤링 페이퍼 ✨</h3>
        <div className="rolling_recent_card">
          {renderCardList(recentCard)}
          {recentOffset + limit < recentTotal && (
            <Button className="next_icon icon" onClick={onClickNextRecent}>
              <img src={list_arrow} alt="다음" />
            </Button>
          )}
          {recentOffset > 0 && (
            <Button className="prev_icon icon" onClick={onClickPrevRecent}>
              <img src={list_arrow} alt="이전" />
            </Button>
          )}
        </div>
      </div>

      <div className="listpage_btn_area">
        <Link to="/post">
          <Button className="list_btn btn primary lg txt-18-b">
            나도 만들어보기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default List;
