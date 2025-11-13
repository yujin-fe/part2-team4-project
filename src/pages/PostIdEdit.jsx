import "./PostId.scss";
import { Suspense, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingScreen from "../components/Loading";

import returnIcon from "../assets/icons/return_icon.png";
import Button from "../components/Button";
// import MessageCard from "../components/MessageCard";
const MessageCard = lazy(() => import("../components/MessageCard"));

const PostIdEdit = () => {
  const params = useParams();
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MessageCard
        recipientId={params.id}
        showAddCard={false}
        showDeleteCardBtn={true}
        showDeletePaperBtn={true}
        className="edit-page-card"
      />
      <div className="btn-set">
        <div className="return-set">
          <div className="return-descipttion txt-15">돌아가기</div>
          <Button
            onClick={() => navigate(`/post/${params.id}`)}
            variant="outlined"
            icon={returnIcon}
            className={"return-btn"}
          />
        </div>
      </div>
    </Suspense>
  );
};

export default PostIdEdit;
