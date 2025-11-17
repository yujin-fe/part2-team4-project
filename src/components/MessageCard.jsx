import "./MessageCard.scss";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { getBackgroundData } from "../api/images";
import { deleteMessage, getMessages } from "../api/message";
import { deleteRecipient } from "../api/recipients";
import bin from "../assets/icons/deleted.png";
import { useModal } from "../contexts/ModalContext";

import AddMessageCard from "./AddMessageCard";
import Badge from "./Badge";
import Button from "./Button";
import MessageModal from "./MessageModal";

const relationMap = {
  친구: "friend",
  동료: "coworker",
  지인: "acquaintance",
  가족: "family",
};

const fontMap = {
  "Noto Sans": "font-noto-sans",
  Pretendard: "font-pretendard",
  나눔명조: "font-nanum-myeongjo",
  "나눔손글씨 손편지체": "font-nanum-handwriting",
};

//현재 다중 호출때문에 외부로 캐시를 빼서 한번만 실행
const cache = {};

function createResource(asyncFn, key) {
  // 이미 캐시에 있으면 기존 데이터 사용
  if (cache[key]) return cache[key];

  let status = "pending";
  let result;

  const promise = asyncFn()
    .then((res) => {
      status = "success";
      result = res;
    })
    .catch((err) => {
      status = "error";
      result = err;
    });

  cache[key] = {
    read() {
      if (status === "pending") throw promise; // Suspense가 fallback 표시
      if (status === "error") throw result;
      return result;
    },
  };

  return cache[key];
}

const MessageCard = ({
  recipientId,
  showAddCard = true,
  showDeleteCardBtn = false,
  showDeletePaperBtn = false,
  className = "",
}) => {
  const { openModal, closeModal } = useModal();
  const navigate = useNavigate();
  const dataResource = useMemo(
    () =>
      createResource(async () => {
        if (!recipientId)
          return { backgroundImage: "", backgroundColor: "", messages: [] };

        const [bgData, msgData] = await Promise.all([
          getBackgroundData(recipientId),
          getMessages(recipientId),
        ]);

        return {
          backgroundImage: bgData.backgroundImage,
          backgroundColor: bgData.backgroundColor,
          messages: msgData.results,
        };
      }, recipientId),
    [recipientId]
  );

  // 여기서 Promise 던짐
  const { backgroundImage, backgroundColor, messages } = dataResource.read();

  // 모달 열기
  const handleOpen = (msg) => {
    openModal(<MessageModal data={msg} onClose={closeModal} />);
  };

  // 메시지 삭제
  const handleDeleteMessage = async (msgId) => {
    await deleteMessage(msgId);
    alert("메시지가 삭제되었습니다.");
    delete cache[recipientId]; // 캐시 무효화
    window.location.reload(); // 간단한 refetch
  };

  // 롤링페이퍼 삭제
  const handleDeletePaper = async () => {
    if (!window.confirm("정말로 롤링페이퍼를 삭제하시겠습니까?")) return;
    await deleteRecipient(recipientId);
    alert("롤링페이퍼가 삭제되었습니다!");
    navigate("/list");
  };

  // HTML 엔티티 변환
  const decodeHtmlEntities = (str) => {
    const doc = new DOMParser().parseFromString(String(str), "text/html");
    return doc.documentElement.textContent;
  };

  return (
    <div
      className="message-card-wrapper"
      style={{
        background: backgroundImage
          ? `url(${backgroundImage}) center/cover no-repeat`
          : backgroundColor
            ? `var(--${backgroundColor}-200)`
            : "white",
      }}
    >
      {/* 롤링페이퍼 삭제 버튼 */}
      {showDeletePaperBtn && (
        <div className="delete-paper-btn">
          <Button onClick={handleDeletePaper}>롤링페이퍼 삭제하기</Button>
        </div>
      )}

      <div className={`message-cards ${className}`}>
        {/* 메시지 카드 추가 버튼 */}
        {showAddCard && <AddMessageCard recipientId={recipientId} />}

        {/* 메시지 카드 리스트 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="message-card"
            onClick={() => handleOpen(msg)}
          >
            <div className="message-card-top">
              {/* 프로필 이미지 */}
              <img
                className="profile-img"
                src={msg.profileImageURL}
                alt={msg.sender}
              />
              {/* 보낸 사람 + 관계 */}
              <div className="sender txt-20">
                <div className="sender-name">
                  From. <span className="txt-20-b">{msg.sender}</span>
                </div>
                <Badge
                  className="sender-relation"
                  text={msg.relationship}
                  relationType={relationMap[msg.relationship] || "other"}
                />
              </div>

              {/* 메시지 삭제 버튼 */}
              {showDeleteCardBtn && (
                <Button
                  icon={bin}
                  variant="outlined"
                  style={{ padding: "6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMessage(msg.id);
                  }}
                />
              )}
            </div>

            {/* 메시지 내용 */}
            <div
              className={`content txt-18 ${
                fontMap[msg.font] || "font-noto-sans"
              }`}
            >
              {decodeHtmlEntities(msg.content)}
            </div>
            {/* 생성일 */}
            <small className="date">
              {new Date(msg.createdAt).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageCard;
