var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _client, _currentQuery, _currentQueryInitialState, _currentResult, _currentResultState, _currentResultOptions, _selectError, _selectFn, _selectResult, _lastQueryWithDefinedData, _staleTimeoutId, _refetchIntervalId, _currentRefetchInterval, _trackedProps, _QueryObserver_instances, executeFetch_fn, shouldScheduleTimer_fn, updateStaleTimeout_fn, computeRefetchInterval_fn, updateRefetchInterval_fn, updateTimers_fn, clearStaleTimeout_fn, clearRefetchInterval_fn, updateQuery_fn, _a, _client2, _currentResult2, _currentMutation, _mutateOptions, _MutationObserver_instances, updateResult_fn, notify_fn, _b;
import { aR as Subscribable, aS as resolveQueryValue, aT as shallowEqualObjects, aU as noop, aV as isServer, aW as isValidTimeout, aX as timeUntilStale, aY as timeoutManager, aZ as focusManager, a_ as fetchState, a$ as replaceData, b0 as notifyManager, b1 as hashKey, b2 as getDefaultState, r as reactExports, b3 as shouldThrowError, a1 as useQueryClient } from "./index-D-QmlRT_.js";
var QueryObserver = (_a = class extends Subscribable {
  constructor(client, options) {
    super();
    __privateAdd(this, _QueryObserver_instances);
    __privateAdd(this, _client);
    __privateAdd(this, _currentQuery);
    __privateAdd(this, _currentQueryInitialState);
    __privateAdd(this, _currentResult);
    __privateAdd(this, _currentResultState);
    __privateAdd(this, _currentResultOptions);
    __privateAdd(this, _selectError);
    __privateAdd(this, _selectFn);
    __privateAdd(this, _selectResult);
    __privateAdd(this, _lastQueryWithDefinedData);
    __privateAdd(this, _staleTimeoutId);
    __privateAdd(this, _refetchIntervalId);
    __privateAdd(this, _currentRefetchInterval);
    __privateAdd(this, _trackedProps, /* @__PURE__ */ new Set());
    this.options = options;
    __privateSet(this, _client, client);
    __privateSet(this, _selectError, null);
    this.bindMethods();
    this.setOptions(options);
  }
  /**
  * Binds the methods of the result (`refetch`) to the observer, so they keep working when destructured
  * from it. Subclasses override it to bind their own result methods as well.
  */
  bindMethods() {
    this.refetch = this.refetch.bind(this);
  }
  onSubscribe() {
    if (this.listeners.size === 1) {
      __privateGet(this, _currentQuery).addObserver(this);
      if (shouldFetchOnMount(__privateGet(this, _currentQuery), this.options)) __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
      else this.updateResult();
      __privateMethod(this, _QueryObserver_instances, updateTimers_fn).call(this);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) this.destroy();
  }
  /**
  * Returns whether the observed query is currently stale and configured
  * (via the `refetchOnReconnect` option) to refetch when the network
  * reconnects.
  * @returns `true` if the observer should refetch the query on reconnect.
  */
  shouldFetchOnReconnect() {
    return shouldFetchOn(__privateGet(this, _currentQuery), this.options, this.options.refetchOnReconnect);
  }
  /**
  * Returns whether the observed query is currently stale and configured
  * (via the `refetchOnWindowFocus` option) to refetch when the window
  * regains focus.
  * @returns `true` if the observer should refetch the query on window focus.
  */
  shouldFetchOnWindowFocus() {
    return shouldFetchOn(__privateGet(this, _currentQuery), this.options, this.options.refetchOnWindowFocus);
  }
  /**
  * Stops observing the current query: clears all listeners, cancels the
  * stale and refetch-interval timers, and removes this observer from the
  * query it was observing.
  */
  destroy() {
    this.listeners = /* @__PURE__ */ new Set();
    __privateMethod(this, _QueryObserver_instances, clearStaleTimeout_fn).call(this);
    __privateMethod(this, _QueryObserver_instances, clearRefetchInterval_fn).call(this);
    __privateGet(this, _currentQuery).removeObserver(this);
  }
  /**
  * Updates the observer's options. This will re-resolve the query being
  * observed (switching to a different query if the `queryKey` changed),
  * trigger a fetch if the new options require one and the observer has
  * subscribers, recompute the current result, and reschedule the stale and
  * refetch-interval timers as needed.
  * @param options - The new observer options. They are defaulted with {@link
  * QueryClient#defaultQueryOptions} before being applied.
  * @throws {Error} If `enabled` is neither a boolean nor a function.
  * @example
  * ```ts
  * observer.setOptions({ queryKey: ['posts', 1], queryFn: () => fetchPost(1) })
  * // later: switch to a different query, reusing the same observer
  * observer.setOptions({ queryKey: ['posts', 2], queryFn: () => fetchPost(2) })
  * ```
  */
  setOptions(options) {
    const prevOptions = this.options;
    const prevQuery = __privateGet(this, _currentQuery);
    this.options = __privateGet(this, _client).defaultQueryOptions(options);
    if (this.options.enabled !== void 0 && typeof this.options.enabled !== "boolean" && typeof this.options.enabled !== "function" && typeof resolveQueryValue(this.options.enabled, __privateGet(this, _currentQuery)) !== "boolean") throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");
    __privateMethod(this, _QueryObserver_instances, updateQuery_fn).call(this);
    __privateGet(this, _currentQuery).setOptions(this.options);
    if (prevOptions._defaulted && !shallowEqualObjects(this.options, prevOptions)) __privateGet(this, _client).getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: __privateGet(this, _currentQuery),
      observer: this
    });
    const mounted = this.hasListeners();
    if (mounted && shouldFetchOptionally(__privateGet(this, _currentQuery), prevQuery, this.options, prevOptions)) __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
    this.updateResult();
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveQueryValue(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveQueryValue(prevOptions.enabled, __privateGet(this, _currentQuery)) || resolveQueryValue(this.options.staleTime, __privateGet(this, _currentQuery)) !== resolveQueryValue(prevOptions.staleTime, __privateGet(this, _currentQuery)))) __privateMethod(this, _QueryObserver_instances, updateStaleTimeout_fn).call(this);
    const nextRefetchInterval = __privateMethod(this, _QueryObserver_instances, computeRefetchInterval_fn).call(this);
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveQueryValue(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveQueryValue(prevOptions.enabled, __privateGet(this, _currentQuery)) || nextRefetchInterval !== __privateGet(this, _currentRefetchInterval))) __privateMethod(this, _QueryObserver_instances, updateRefetchInterval_fn).call(this, nextRefetchInterval);
  }
  /**
  * Computes the result the observer would produce for the given (already-defaulted) options
  * right now, building the underlying `Query` if it doesn't exist yet, without waiting for a
  * subscription callback. Called by framework adapters on every render (e.g. `useQuery`) so the
  * returned value is available synchronously, ahead of `setOptions` triggering an actual fetch.
  * @param options - The defaulted observer options to compute the result for.
  * @returns The result for the given options.
  */
  getOptimisticResult(options) {
    const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), options);
    const result = this.createResult(query, options);
    if (!shallowEqualObjects(this.getCurrentResult(), result)) {
      __privateSet(this, _currentResult, result);
      __privateSet(this, _currentResultOptions, this.options);
      __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    }
    return result;
  }
  /**
  * Returns the most recently computed `QueryObserverResult` for the
  * observed query. This is a point-in-time read; to be notified of updates
  * as they happen, subscribe to the observer instead (its inherited
  * `subscribe` method).
  * @returns The observer's latest result.
  * @example
  * ```ts
  * const result = observer.getCurrentResult()
  * console.log(result.status, result.data)
  * ```
  */
  getCurrentResult() {
    return __privateGet(this, _currentResult);
  }
  /**
  * Wraps a `QueryObserverResult` in a `Proxy` that records which properties are read, via
  * {@link QueryObserver#trackProp} (and an optional `onPropTracked` callback). Used by framework
  * adapters when `notifyOnChangeProps` is not set, to implement its default "only re-render on
  * properties you actually read" behavior.
  * @param result - The result to wrap.
  * @param onPropTracked - Called with the name of each property that is read.
  * @returns A proxy of `result` that tracks property reads.
  */
  trackResult(result, onPropTracked) {
    return new Proxy(result, { get: (target, key) => {
      this.trackProp(key);
      onPropTracked == null ? void 0 : onPropTracked(key);
      return Reflect.get(target, key);
    } });
  }
  /**
  * Records that the given `QueryObserverResult` property was read, so a subsequent update only
  * notifies this observer if a tracked property actually changed. Normally called indirectly via
  * {@link QueryObserver#trackResult}'s proxy; exposed directly for adapters that track property
  * access themselves (e.g. through their own reactivity system) instead of via the proxy.
  * @param key - The name of the property that was read.
  */
  trackProp(key) {
    __privateGet(this, _trackedProps).add(key);
  }
  /**
  * Returns the `Query` instance this observer is currently observing.
  * @returns The observed query.
  */
  getCurrentQuery() {
    return __privateGet(this, _currentQuery);
  }
  /**
  * Refetches the observed query and returns a promise that resolves with
  * the resulting `QueryObserverResult`.
  * @param options - Set `cancelRefetch` to `false` to keep a running fetch instead of cancelling
  * it, and `throwOnError` to `true` to reject when the refetch fails.
  * @returns A promise that resolves with the result after the refetch.
  * @example
  * ```ts
  * const result = await observer.refetch({ cancelRefetch: false })
  * console.log(result.data)
  * ```
  */
  refetch({ ...options } = {}) {
    return this.fetch({ ...options });
  }
  /**
  * Fetches a query defined by the given options without affecting this
  * observer's own tracked query or result, and returns a promise that
  * resolves with the `QueryObserverResult` for that fetch. This is useful
  * for prefetching data that another observer (e.g. a query about to be
  * navigated to) will need, ahead of time.
  * @param options - The observer options of the query to fetch.
  * @returns A promise that resolves with the result for the fetched query.
  * @example
  * ```ts
  * const result = await observer.fetchOptimistic({
  *   queryKey: ['posts', 2],
  *   queryFn: () => fetchPost(2),
  * })
  * console.log(result.data)
  * ```
  */
  fetchOptimistic(options) {
    const defaultedOptions = __privateGet(this, _client).defaultQueryOptions(options);
    const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), defaultedOptions);
    let unsubscribe = () => {
    };
    let resolveEarly;
    const cachePromise = new Promise((resolve) => {
      resolveEarly = resolve;
      unsubscribe = __privateGet(this, _client).getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryHash === query.queryHash && query.state.data !== void 0) {
          unsubscribe();
          resolve(this.createResult(query, defaultedOptions));
        }
      });
    });
    return Promise.race([query.fetch(defaultedOptions).then(() => {
      const result = this.createResult(query, defaultedOptions);
      resolveEarly == null ? void 0 : resolveEarly(result);
      return result;
    }).finally(() => {
      unsubscribe();
    }), cachePromise]);
  }
  /**
  * Fetches the observed query and updates the result once the fetch settles. Used by `refetch` and,
  * in `InfiniteQueryObserver`, to fetch more pages.
  * @param fetchOptions - Options for this fetch. `cancelRefetch` defaults to `true`.
  * @returns A promise that resolves with the updated result.
  */
  fetch(fetchOptions) {
    return __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this, {
      ...fetchOptions,
      cancelRefetch: fetchOptions.cancelRefetch ?? true
    }).then(() => {
      this.updateResult();
      return __privateGet(this, _currentResult);
    });
  }
  /**
  * Computes the result for a query and options from the query's state, applying `select`,
  * `placeholderData`, and the derived flags. Subclasses override it to add their own fields.
  * @param query - The query to compute the result for.
  * @param options - The observer options to compute the result with.
  * @returns The computed result.
  */
  createResult(query, options) {
    var _a2;
    const prevQuery = __privateGet(this, _currentQuery);
    const prevOptions = this.options;
    const prevResult = __privateGet(this, _currentResult);
    const prevResultState = __privateGet(this, _currentResultState);
    const prevResultOptions = __privateGet(this, _currentResultOptions);
    const queryInitialState = query !== prevQuery ? query.state : __privateGet(this, _currentQueryInitialState);
    const { state } = query;
    let newState = { ...state };
    let isPlaceholderData = false;
    let data;
    if (options._optimisticResults) {
      const mounted = this.hasListeners();
      const fetchOnMount = !mounted && shouldFetchOnMount(query, options);
      const fetchOptionally = mounted && shouldFetchOptionally(query, prevQuery, options, prevOptions);
      if (fetchOnMount || fetchOptionally) newState = {
        ...newState,
        ...fetchState(state.data, query.options)
      };
      if (options._optimisticResults === "isRestoring") newState.fetchStatus = "idle";
    }
    let { error, errorUpdatedAt, status } = newState;
    data = newState.data;
    let skipSelect = false;
    if (options.placeholderData !== void 0 && data === void 0 && status === "pending") {
      let placeholderData;
      if ((prevResult == null ? void 0 : prevResult.isPlaceholderData) && options.placeholderData === (prevResultOptions == null ? void 0 : prevResultOptions.placeholderData)) {
        placeholderData = prevResult.data;
        skipSelect = true;
      } else placeholderData = typeof options.placeholderData === "function" ? options.placeholderData((_a2 = __privateGet(this, _lastQueryWithDefinedData)) == null ? void 0 : _a2.state.data, __privateGet(this, _lastQueryWithDefinedData)) : options.placeholderData;
      if (placeholderData !== void 0) {
        status = "success";
        data = replaceData(prevResult == null ? void 0 : prevResult.data, placeholderData, options);
        isPlaceholderData = true;
      }
    }
    if (options.select && data !== void 0 && !skipSelect) {
      if (prevResult && data === (prevResultState == null ? void 0 : prevResultState.data) && options.select === __privateGet(this, _selectFn)) data = __privateGet(this, _selectResult);
      else try {
        __privateSet(this, _selectFn, options.select);
        data = options.select(data);
        data = replaceData(prevResult == null ? void 0 : prevResult.data, data, options);
        __privateSet(this, _selectResult, data);
        __privateSet(this, _selectError, null);
      } catch (selectError) {
        __privateSet(this, _selectError, selectError);
      }
    } else if (data === void 0) __privateSet(this, _selectError, null);
    if (__privateGet(this, _selectError)) {
      error = __privateGet(this, _selectError);
      data = __privateGet(this, _selectResult);
      errorUpdatedAt = Date.now();
      status = "error";
      isPlaceholderData = false;
    }
    const isFetching = newState.fetchStatus === "fetching";
    const isPending = status === "pending";
    const isError = status === "error";
    const isLoading = isPending && isFetching;
    const hasData = data !== void 0;
    return {
      status,
      fetchStatus: newState.fetchStatus,
      isPending,
      isSuccess: status === "success",
      isError,
      isInitialLoading: isLoading,
      isLoading,
      data,
      dataUpdatedAt: newState.dataUpdatedAt,
      error,
      errorUpdatedAt,
      failureCount: newState.fetchFailureCount,
      failureReason: newState.fetchFailureReason,
      errorUpdateCount: newState.errorUpdateCount,
      isFetched: query.isFetched(),
      isFetchedAfterMount: newState.dataUpdateCount > queryInitialState.dataUpdateCount || newState.errorUpdateCount > queryInitialState.errorUpdateCount,
      isFetching,
      isRefetching: isFetching && !isPending,
      isLoadingError: isError && !hasData,
      isPaused: newState.fetchStatus === "paused",
      isPlaceholderData,
      isRefetchError: isError && hasData,
      isStale: isStale(query, options),
      refetch: this.refetch,
      isEnabled: resolveQueryValue(options.enabled, query) !== false
    };
  }
  /**
  * Recomputes and stores the current result from the current query/options, notifying listeners
  * if it changed. Framework adapters call this right after subscribing to make sure no query
  * update was missed in the gap between creating the observer and subscribing to it.
  */
  updateResult() {
    const prevResult = __privateGet(this, _currentResult);
    const nextResult = this.createResult(__privateGet(this, _currentQuery), this.options);
    __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    __privateSet(this, _currentResultOptions, this.options);
    if (__privateGet(this, _currentResultState).data !== void 0) __privateSet(this, _lastQueryWithDefinedData, __privateGet(this, _currentQuery));
    if (shallowEqualObjects(nextResult, prevResult)) return;
    __privateSet(this, _currentResult, nextResult);
    const shouldNotifyListeners = () => {
      if (!prevResult) return true;
      const { notifyOnChangeProps } = this.options;
      const notifyOnChangePropsValue = typeof notifyOnChangeProps === "function" ? notifyOnChangeProps() : notifyOnChangeProps;
      if (notifyOnChangePropsValue === "all" || !notifyOnChangePropsValue && !__privateGet(this, _trackedProps).size) return true;
      if (this.options.throwOnError && __privateGet(this, _currentResult).error !== prevResult.error) return true;
      for (const key of notifyOnChangePropsValue ?? __privateGet(this, _trackedProps)) if (__privateGet(this, _currentResult)[key] !== prevResult[key]) return true;
      return false;
    };
    const notifyListeners = shouldNotifyListeners();
    notifyManager.batch(() => {
      if (notifyListeners) this.listeners.forEach((listener) => {
        listener(__privateGet(this, _currentResult));
      });
      __privateGet(this, _client).getQueryCache().notify({
        query: __privateGet(this, _currentQuery),
        type: "observerResultsUpdated"
      });
    });
  }
  /**
  * Updates the observer's result when the observed query changes, and reschedules its timers if it
  * has listeners.
  * @internal
  */
  onQueryUpdate() {
    this.updateResult();
    if (this.hasListeners()) __privateMethod(this, _QueryObserver_instances, updateTimers_fn).call(this);
  }
}, _client = new WeakMap(), _currentQuery = new WeakMap(), _currentQueryInitialState = new WeakMap(), _currentResult = new WeakMap(), _currentResultState = new WeakMap(), _currentResultOptions = new WeakMap(), _selectError = new WeakMap(), _selectFn = new WeakMap(), _selectResult = new WeakMap(), _lastQueryWithDefinedData = new WeakMap(), _staleTimeoutId = new WeakMap(), _refetchIntervalId = new WeakMap(), _currentRefetchInterval = new WeakMap(), _trackedProps = new WeakMap(), _QueryObserver_instances = new WeakSet(), executeFetch_fn = function(fetchOptions) {
  __privateMethod(this, _QueryObserver_instances, updateQuery_fn).call(this);
  let promise = __privateGet(this, _currentQuery).fetch(this.options, fetchOptions);
  if (!(fetchOptions == null ? void 0 : fetchOptions.throwOnError)) promise = promise.catch(noop);
  return promise;
}, shouldScheduleTimer_fn = function(timeout) {
  return !isServer() && resolveQueryValue(this.options.enabled, __privateGet(this, _currentQuery)) !== false && isValidTimeout(timeout);
}, updateStaleTimeout_fn = function() {
  __privateMethod(this, _QueryObserver_instances, clearStaleTimeout_fn).call(this);
  const staleTime = resolveQueryValue(this.options.staleTime, __privateGet(this, _currentQuery));
  if (__privateGet(this, _currentResult).isStale || !__privateMethod(this, _QueryObserver_instances, shouldScheduleTimer_fn).call(this, staleTime)) return;
  const timeout = timeUntilStale(__privateGet(this, _currentResult).dataUpdatedAt, staleTime) + 1;
  __privateSet(this, _staleTimeoutId, timeoutManager.setTimeout(() => {
    if (!__privateGet(this, _currentResult).isStale) this.updateResult();
  }, timeout));
}, computeRefetchInterval_fn = function() {
  return resolveQueryValue(this.options.refetchInterval, __privateGet(this, _currentQuery)) ?? false;
}, updateRefetchInterval_fn = function(nextInterval) {
  __privateMethod(this, _QueryObserver_instances, clearRefetchInterval_fn).call(this);
  __privateSet(this, _currentRefetchInterval, nextInterval);
  if (__privateGet(this, _currentRefetchInterval) === 0 || !__privateMethod(this, _QueryObserver_instances, shouldScheduleTimer_fn).call(this, __privateGet(this, _currentRefetchInterval))) return;
  __privateSet(this, _refetchIntervalId, timeoutManager.setInterval(() => {
    if (this.options.refetchIntervalInBackground || focusManager.isFocused()) __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
  }, __privateGet(this, _currentRefetchInterval)));
}, updateTimers_fn = function() {
  __privateMethod(this, _QueryObserver_instances, updateStaleTimeout_fn).call(this);
  __privateMethod(this, _QueryObserver_instances, updateRefetchInterval_fn).call(this, __privateMethod(this, _QueryObserver_instances, computeRefetchInterval_fn).call(this));
}, clearStaleTimeout_fn = function() {
  if (__privateGet(this, _staleTimeoutId) !== void 0) {
    timeoutManager.clearTimeout(__privateGet(this, _staleTimeoutId));
    __privateSet(this, _staleTimeoutId, void 0);
  }
}, clearRefetchInterval_fn = function() {
  if (__privateGet(this, _refetchIntervalId) !== void 0) {
    timeoutManager.clearInterval(__privateGet(this, _refetchIntervalId));
    __privateSet(this, _refetchIntervalId, void 0);
  }
}, updateQuery_fn = function() {
  const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), this.options);
  if (query === __privateGet(this, _currentQuery)) return;
  const prevQuery = __privateGet(this, _currentQuery);
  __privateSet(this, _currentQuery, query);
  __privateSet(this, _currentQueryInitialState, query.state);
  if (this.hasListeners()) {
    prevQuery == null ? void 0 : prevQuery.removeObserver(this);
    query.addObserver(this);
  }
}, _a);
function shouldLoadOnMount(query, options) {
  return resolveQueryValue(options.enabled, query) !== false && query.state.data === void 0 && !(query.state.status === "error" && resolveQueryValue(options.retryOnMount, query) === false);
}
function shouldFetchOnMount(query, options) {
  return shouldLoadOnMount(query, options) || query.state.data !== void 0 && shouldFetchOn(query, options, options.refetchOnMount);
}
function shouldFetchOn(query, options, field) {
  if (resolveQueryValue(options.enabled, query) !== false && resolveQueryValue(options.staleTime, query) !== "static") {
    const value = resolveQueryValue(field, query);
    return value === "always" || value !== false && isStale(query, options);
  }
  return false;
}
function shouldFetchOptionally(query, prevQuery, options, prevOptions) {
  return (query !== prevQuery || resolveQueryValue(prevOptions.enabled, query) === false) && (!options.suspense || query.state.status !== "error") && isStale(query, options);
}
function isStale(query, options) {
  return resolveQueryValue(options.enabled, query) !== false && query.isStaleByTime(resolveQueryValue(options.staleTime, query));
}
var MutationObserver = (_b = class extends Subscribable {
  constructor(client, options) {
    super();
    __privateAdd(this, _MutationObserver_instances);
    __privateAdd(this, _client2);
    __privateAdd(this, _currentResult2);
    __privateAdd(this, _currentMutation);
    __privateAdd(this, _mutateOptions);
    __privateSet(this, _client2, client);
    this.setOptions(options);
    this.bindMethods();
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
  }
  /**
  * Binds the methods of the result (`mutate` and `reset`) to the observer, so they keep working when
  * destructured from it.
  */
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  /**
  * Updates the observer's options.
  *
  * If the new `mutationKey` differs from the previous one (and both were
  * defined), the observer is reset, detaching it from the mutation it was
  * observing. Otherwise, if the currently observed mutation is still
  * `pending`, its options are updated in place as well.
  * @param options - The new mutation observer options. They are defaulted with {@link
  * QueryClient#defaultMutationOptions} before being applied.
  * @example
  * ```ts
  * observer.setOptions({
  *   mutationFn: (variables: { title: string }) => addPost(variables),
  *   onSuccess: (data) => console.log(data),
  * })
  * ```
  */
  setOptions(options) {
    var _a2;
    const prevOptions = this.options;
    this.options = __privateGet(this, _client2).defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) __privateGet(this, _client2).getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: __privateGet(this, _currentMutation),
      observer: this
    });
    if ((prevOptions == null ? void 0 : prevOptions.mutationKey) && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) this.reset();
    else if (((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state.status) === "pending") __privateGet(this, _currentMutation).setOptions(this.options);
  }
  onSubscribe() {
    if (this.listeners.size === 1 && __privateGet(this, _currentMutation)) {
      __privateGet(this, _currentMutation).addObserver(this);
      __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
  }
  /**
  * Updates the observer's result when the observed mutation changes, and notifies its listeners.
  * @internal
  * @param action - The action that updated the observed mutation, passed on to the observer's
  * callbacks.
  */
  onMutationUpdate(action) {
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn).call(this, action);
  }
  /**
  * Returns the observer's current result, derived from the observed
  * mutation's state (or the default, `idle` state if no mutation has been
  * built yet, e.g. before the first `mutate()` call or after `reset()`).
  * @returns The observer's latest result.
  */
  getCurrentResult() {
    return __privateGet(this, _currentResult2);
  }
  /**
  * Detaches the observer from the mutation it is currently observing (if
  * any) and resets the observed result back to its default, `idle` state.
  *
  * This does not cancel an in-flight mutation; the mutation itself keeps
  * running to completion and its own callbacks still fire, but this
  * observer stops reflecting its state and a subsequent `mutate()` call
  * will build a brand new mutation.
  * @see {@link MutationObserver#mutate}
  * @example
  * ```ts
  * observer.reset()
  * ```
  */
  reset() {
    var _a2;
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, void 0);
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn).call(this);
  }
  /**
  * Builds a new `Mutation` in the `MutationCache` using the observer's
  * current options, detaches this observer from any previously observed
  * mutation, attaches it to the new one, and executes it with the given
  * variables.
  *
  * The optional per-call `options` (`onSuccess`/`onError`/`onSettled`) are
  * invoked once the mutation settles, in addition to any callbacks defined
  * on the observer's own options.
  * @param variables - The variables passed to the `mutationFn`.
  * @param options - Per-call `onSuccess`, `onError`, and `onSettled` callbacks.
  * @returns A promise that resolves with the mutation's data, or rejects with its error.
  * @example
  * ```ts
  * await observer.mutate(
  *   { title: 'New post' },
  *   { onSuccess: (data) => console.log(data) },
  * )
  * ```
  */
  mutate(variables, options) {
    var _a2;
    __privateSet(this, _mutateOptions, options);
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, __privateGet(this, _client2).getMutationCache().build(__privateGet(this, _client2), this.options));
    __privateGet(this, _currentMutation).addObserver(this);
    return __privateGet(this, _currentMutation).execute(variables);
  }
}, _client2 = new WeakMap(), _currentResult2 = new WeakMap(), _currentMutation = new WeakMap(), _mutateOptions = new WeakMap(), _MutationObserver_instances = new WeakSet(), updateResult_fn = function() {
  var _a2;
  const state = ((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state) ?? getDefaultState();
  __privateSet(this, _currentResult2, {
    ...state,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    mutate: this.mutate,
    reset: this.reset
  });
}, notify_fn = function(action) {
  notifyManager.batch(() => {
    var _a2, _b2, _c, _d;
    const mutateOptions = __privateGet(this, _mutateOptions);
    if (mutateOptions && this.hasListeners()) {
      const variables = __privateGet(this, _currentResult2).variables;
      const onMutateResult = __privateGet(this, _currentResult2).context;
      const context = {
        client: __privateGet(this, _client2),
        meta: this.options.meta,
        mutationKey: this.options.mutationKey
      };
      if ((action == null ? void 0 : action.type) === "success") {
        try {
          (_a2 = mutateOptions.onSuccess) == null ? void 0 : _a2.call(mutateOptions, action.data, variables, onMutateResult, context);
        } catch (e) {
          Promise.reject(e);
        }
        try {
          (_b2 = mutateOptions.onSettled) == null ? void 0 : _b2.call(mutateOptions, action.data, null, variables, onMutateResult, context);
        } catch (e) {
          Promise.reject(e);
        }
      } else if ((action == null ? void 0 : action.type) === "error") {
        try {
          (_c = mutateOptions.onError) == null ? void 0 : _c.call(mutateOptions, action.error, variables, onMutateResult, context);
        } catch (e) {
          Promise.reject(e);
        }
        try {
          (_d = mutateOptions.onSettled) == null ? void 0 : _d.call(mutateOptions, void 0, action.error, variables, onMutateResult, context);
        } catch (e) {
          Promise.reject(e);
        }
      }
    }
    this.listeners.forEach((listener) => {
      listener(__privateGet(this, _currentResult2));
    });
  });
}, _b);
const IsRestoringContext = reactExports.createContext(false);
const useIsRestoring = () => reactExports.useContext(IsRestoringContext);
IsRestoringContext.Provider;
function createValue() {
  let isReset = false;
  return {
    /**
    * Clears the reset state, so queries know not to try again until the boundary is reset again.
    */
    clearReset: () => {
      isReset = false;
    },
    /**
    * Resets any query errors within the boundary, so queries know they can try again.
    */
    reset: () => {
      isReset = true;
    },
    /**
    * Returns whether the boundary has been reset and not yet cleared.
    * @returns `true` if the boundary has been reset and not yet cleared.
    */
    isReset: () => {
      return isReset;
    }
  };
}
const QueryErrorResetBoundaryContext = reactExports.createContext(createValue());
const useQueryErrorResetBoundary = () => reactExports.useContext(QueryErrorResetBoundaryContext);
const ensurePreventErrorBoundaryRetry = (options, errorResetBoundary, query) => {
  const throwOnError = (query == null ? void 0 : query.state.status) === "error" && typeof options.throwOnError === "function" ? shouldThrowError(options.throwOnError, [query.state.error, query]) : options.throwOnError;
  if (options.suspense || throwOnError) {
    if (!errorResetBoundary.isReset()) options.retryOnMount = false;
  }
};
const useClearResetErrorBoundary = (errorResetBoundary) => {
  reactExports.useEffect(() => {
    errorResetBoundary.clearReset();
  }, [errorResetBoundary]);
};
const getHasError = ({ result, errorResetBoundary, throwOnError, query, suspense }) => {
  return result.isError && !errorResetBoundary.isReset() && !result.isFetching && query && (suspense && result.data === void 0 || shouldThrowError(throwOnError, [result.error, query]));
};
const ensureSuspenseTimers = (defaultedOptions) => {
  if (defaultedOptions.suspense) {
    const MIN_SUSPENSE_TIME_MS = 1e3;
    const clamp = (value) => value === "static" ? value : Math.max(value ?? MIN_SUSPENSE_TIME_MS, MIN_SUSPENSE_TIME_MS);
    const originalStaleTime = defaultedOptions.staleTime;
    defaultedOptions.staleTime = typeof originalStaleTime === "function" ? (...args) => clamp(originalStaleTime(...args)) : clamp(originalStaleTime);
    if (typeof defaultedOptions.gcTime === "number") defaultedOptions.gcTime = Math.max(defaultedOptions.gcTime, MIN_SUSPENSE_TIME_MS);
  }
};
const shouldSuspend = (defaultedOptions, result) => (defaultedOptions == null ? void 0 : defaultedOptions.suspense) && result.isPending;
const fetchOptimistic = (defaultedOptions, observer, errorResetBoundary) => observer.fetchOptimistic(defaultedOptions).catch(() => {
  errorResetBoundary.clearReset();
});
function useBaseQuery(options, Observer, queryClient) {
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const client = useQueryClient();
  const defaultedOptions = client.defaultQueryOptions(options);
  const query = client.getQueryCache().get(defaultedOptions.queryHash);
  const subscribed = options.subscribed !== false;
  defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : subscribed ? "optimistic" : void 0;
  ensureSuspenseTimers(defaultedOptions);
  ensurePreventErrorBoundaryRetry(defaultedOptions, errorResetBoundary, query);
  useClearResetErrorBoundary(errorResetBoundary);
  const [observer] = reactExports.useState(() => new Observer(client, defaultedOptions));
  const result = observer.getOptimisticResult(defaultedOptions);
  reactExports.useEffect(() => {
    observer.setOptions(defaultedOptions);
  }, [defaultedOptions, observer]);
  const shouldSubscribe = !isRestoring && subscribed;
  reactExports.useSyncExternalStore(reactExports.useCallback((onStoreChange) => {
    const unsubscribe = shouldSubscribe ? observer.subscribe(notifyManager.batchCalls(onStoreChange)) : noop;
    observer.updateResult();
    return unsubscribe;
  }, [observer, shouldSubscribe]), () => observer.getCurrentResult(), () => observer.getCurrentResult());
  if (shouldSuspend(defaultedOptions, result)) throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary);
  if (getHasError({
    result,
    errorResetBoundary,
    throwOnError: defaultedOptions.throwOnError,
    query,
    suspense: defaultedOptions.suspense
  })) throw result.error;
  return !defaultedOptions.notifyOnChangeProps ? observer.trackResult(result) : result;
}
function useQuery(options, queryClient) {
  return useBaseQuery(options, QueryObserver);
}
function useMutation(options, queryClient) {
  const client = useQueryClient();
  const [observer] = reactExports.useState(() => new MutationObserver(client, options));
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(reactExports.useCallback((onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)), [observer]), () => observer.getCurrentResult(), () => observer.getCurrentResult());
  const mutate = reactExports.useCallback((...args) => {
    observer.mutate(args[0], args[1]).catch(noop);
  }, [observer]);
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
  return {
    ...result,
    mutate,
    mutateAsync: result.mutate
  };
}
export {
  useMutation as a,
  useQuery as u
};
