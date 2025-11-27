import { CodeBlock } from "../code-block";

const mockCode = `import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
};

export default UserCard;`;

export const Editor = () => (
  <div className="overflow-hidden">
    <CodeBlock
      className="rounded-none border-none bg-transparent"
      code={mockCode}
      lang="tsx"
    />
  </div>
);
