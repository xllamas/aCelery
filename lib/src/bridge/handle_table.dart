/// Monotonic integer handle allocator.
///
/// The JS side stores whatever integer it is given and passes it back on every
/// call (`this.dbHandle`, `this.fileHandle`, cursor ids), so handles must stay
/// stable and must never be reused while live. Mirrors the static
/// `HashMap<Integer, T>` + `int index` pairs in `aCeleryAndroidInterface.java`.
class HandleTable<T> {
  final Map<int, T> _entries = {};
  int _next = 0;

  int add(T value) {
    _next++;
    _entries[_next] = value;
    return _next;
  }

  T? operator [](int handle) => _entries[handle];

  bool contains(int handle) => _entries.containsKey(handle);

  T? remove(int handle) => _entries.remove(handle);

  Iterable<T> get values => _entries.values;

  void clear() => _entries.clear();
}
