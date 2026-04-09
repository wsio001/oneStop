type DiscoveryResult = {
  date_tabs: { date: string; tab_name: string }[];
  bulletin_tab: { date: string; tab_name: string } | null;
};

export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/sheets/discovery');
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

export async function discoverTabs(): Promise<DiscoveryResult> {
  const response = await fetch('/api/sheets/discovery');

  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, redirect to auth
      window.location.href = '/api/auth/start';
      throw new Error('Not authenticated');
    }
    throw new Error('Failed to discover tabs');
  }

  return response.json();
}

export async function fetchSheetData(tabs: string[]): Promise<Record<string, string[][]>> {
  const response = await fetch(`/api/sheets/data?tabs=${tabs.join(',')}`);

  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, redirect to auth
      window.location.href = '/api/auth/start';
      throw new Error('Not authenticated');
    }
    throw new Error('Failed to fetch sheet data');
  }

  return response.json();
}

export async function fetchAvailableGroups(): Promise<string[]> {
  const response = await fetch('/api/sheets/groups');

  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, redirect to auth
      window.location.href = '/api/auth/start';
      throw new Error('Not authenticated');
    }
    throw new Error('Failed to fetch available groups');
  }

  const data = await response.json();
  return data.groups || [];
}
