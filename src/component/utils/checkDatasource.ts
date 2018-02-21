export const checkDatasource = (datasource) => {
  if (!datasource) {
    throw new Error('No datasource provided');
  }
  if (typeof datasource.get !== 'function') {
    throw new Error('Datasource get should be a function');
  }
  if (datasource.settings && typeof datasource.settings !== 'object') {
    throw new Error('Datasource settings should be an object');
  }
  return datasource;
};