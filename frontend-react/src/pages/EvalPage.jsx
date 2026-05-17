import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import TraineeEvalTab from '../components/Evaluation/TraineeEvalTab';
import { useSession } from '../context/SessionContext';

const EvalPage = () => {
    const { sessionId } = useSession();
    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionId) {
            navigate('/app');
        }
    }, [sessionId, navigate]);

    return (
        <div className="bg-light page-transition page-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppNavbar />
            <div className="sp-app-container">
                <div className="sp-card-wrapper sp-eval-container">
                    <TraineeEvalTab />
                </div>
            </div>
            <AppFooter />
        </div>
    );
};

export default EvalPage;
