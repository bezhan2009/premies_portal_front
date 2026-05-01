import React from 'react';

function DynamicMenu({ forcePasswordChange }) {
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div>
            {/* Other components and buttons */}
            {forcePasswordChange && (
                <div>
                    <button onClick={handleLogout}>Logout</button>
                    <button onClick={handlePasswordChange}>Change Password</button>
                </div>
            )}
        </div>
    );
}

export default DynamicMenu;