'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const BABY_ID = 'dfc12b1e-9b9c-42e7-b813-20315c20d917'

type Tab = 'record' | 'history' | 'stats'
type InputMode = 'none' | 'feed' | 'rehab'

type FeedRecord = {
  id: string
  baby_id: string
  start_time: string
  end_time: string | null
  volume_ml: number
  choking_count: number
  spit_up: boolean
  memo: string
  created_by: string
  paused_seconds: number
}

type FeedEvent = {
  id: string
  record_id: string
  baby_id: string
  event_type: string
  event_time: string
  elapsed_seconds: number | null
  created_by: string
}

type RehabRecord = {
  id: string
  baby_id: string
  exercise_type: string
  start_time: string
  end_time: string | null
  duration_seconds: number
  memo: string
  created_by: string
}

export default function Page() {
  const [tab, setTab] = useState<Tab>('record')
  const [inputMode, setInputMode] = useState<InputMode>('none')
  const [now, setNow] = useState(new Date())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [activeFeed, setActiveFeed] = useState<FeedRecord | null>(null)
  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([])
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])
  const [feedPaused, setFeedPaused] = useState(false)
  const [feedPausedAt, setFeedPausedAt] = useState<Date | null>(null)

  const [chokingFlash, setChokingFlash] = useState(false)
  const [feedFlash, setFeedFlash] = useState(false)

  const [volume, setVolume] = useState(80)
  const [spitUp, setSpitUp] = useState(false)
  const [memo, setMemo] = useState('')
  const [message, setMessage] = useState('')
  const [endedFeed, setEndedFeed] = useState<FeedRecord | null>(null)

  const [historyType, setHistoryType] = useState<'feed' | 'rehab'>('feed')

  const rehabTypes = [
    '터미타임',
    '공터미타임',
    '뒤집기시도',
    '몸중심선',
    '구강/안면 자극',
    '옆 누워 놀기',
    '시각추적 목 회전',
    '가슴 살살 두드림',
  ]



  const [activeRehab, setActiveRehab] = useState<RehabRecord | null>(null)
  const [rehabRecords, setRehabRecords] = useState<RehabRecord[]>([])
  const [rehabPaused, setRehabPaused] = useState(false)
  const [rehabPausedAt, setRehabPausedAt] = useState<Date | null>(null)
  const [rehabPausedSeconds, setRehabPausedSeconds] = useState(0)
  const [rehabMessage, setRehabMessage] = useState('')
  const [recentRehabLogs, setRecentRehabLogs] = useState<string[]>([])
  const [recentRehabTotals, setRecentRehabTotals] = useState<Record<string, number>>({
    터미타임: 0,
    '공터미타임': 0,
    '뒤집기시도': 0,
    '몸중심선': 0,
    '구강/안면 자극': 0,
    '옆 누워 놀기': 0,
    '시각추적 목 회전': 0,
    '가슴 살살 두드림': 0,
  })




  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    setUserEmail(user?.email ?? null)
    setUserId(user?.id ?? null)

    if (user) {
      const feeds = await loadFeedRecords()
      await loadFeedEvents()
      const activeF = await loadActiveFeed()
      const activeR = await loadActiveRehab()
      await loadRehabRecords()

      if (activeF) setInputMode('feed')
      else if (activeR) setInputMode('rehab')
      else setInputMode('none')

      const lastCompleted = feeds.find((r) => r.end_time && r.volume_ml > 0)
      setVolume(lastCompleted?.volume_ml || 80)
    }
  }

  const signup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('회원가입 완료. 이메일 인증 후 로그인하세요.')
  }

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else await checkUser()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setUserId(null)
    setActiveFeed(null)
    setActiveRehab(null)
    setFeedRecords([])
    setRehabRecords([])
    setFeedEvents([])
    setInputMode('none')
  }

  const loadFeedRecords = async () => {
    const { data } = await supabase
      .from('feed_records')
      .select('*')
      .eq('baby_id', BABY_ID)
      .order('start_time', { ascending: false })

    const list = (data as FeedRecord[]) ?? []
    setFeedRecords(list)
    return list
  }

  const loadFeedEvents = async () => {
    const { data } = await supabase
      .from('feed_events')
      .select('*')
      .eq('baby_id', BABY_ID)
      .order('event_time', { ascending: true })

    setFeedEvents((data as FeedEvent[]) ?? [])
  }

  const loadActiveFeed = async () => {
    const { data } = await supabase
      .from('feed_records')
      .select('*')
      .eq('baby_id', BABY_ID)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    setActiveFeed(data as FeedRecord | null)
    return data as FeedRecord | null
  }

  const loadRehabRecords = async () => {
    const { data } = await supabase
      .from('rehab_records')
      .select('*')
      .eq('baby_id', BABY_ID)
      .order('start_time', { ascending: false })

    setRehabRecords((data as RehabRecord[]) ?? [])
  }

  const loadActiveRehab = async () => {
    const { data } = await supabase
      .from('rehab_records')
      .select('*')
      .eq('baby_id', BABY_ID)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    setActiveRehab(data as RehabRecord | null)
    return data as RehabRecord | null
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ko-KR')

    const formatDateOnly = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR')
  
  const formatTimeOnly = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const groupByDate = <T extends { start_time: string }>(items: T[]) => {
      return items.reduce((groups, item) => {
        const date = formatDateOnly(item.start_time)
        if (!groups[date]) groups[date] = []
        groups[date].push(item)
        return groups
      }, {} as Record<string, T[]>)
    }

  const formatElapsed = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '-'
    return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
  }
  const formatElapsedHM = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return '-'
  
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
  
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
  
    return `${hh}:${mm}`
  }

  const getFeedDayStats = (records: FeedRecord[]) => {
    const totalVolume = records.reduce((sum, r) => sum + r.volume_ml, 0)
  
    const totalChoking = records.reduce(
      (sum, r) => sum + r.choking_count,
      0
    )
  
    const totalDuration = records.reduce(
      (sum, r) => sum + getFeedElapsed(r),
      0
    )
  
    const averageDuration =
      records.length > 0
        ? Math.floor(totalDuration / records.length)
        : 0
  
    const averageChoking =
      records.length > 0
        ? totalChoking / records.length
        : 0
  
    // 평균 사레 간격
    const intervals: number[] = []
  
    records.forEach((record) => {
      const events = feedEvents
        .filter(
          (e) =>
            e.record_id === record.id &&
            e.event_type === 'choking'
        )
        .sort(
          (a, b) =>
            new Date(a.event_time).getTime() -
            new Date(b.event_time).getTime()
        )
  
      for (let i = 1; i < events.length; i++) {
        intervals.push(
          (events[i].elapsed_seconds ?? 0) -
            (events[i - 1].elapsed_seconds ?? 0)
        )
      }
    })
  
    const averageInterval =
      intervals.length > 0
        ? Math.floor(
            intervals.reduce((a, b) => a + b, 0) /
              intervals.length
          )
        : 0
  
    return {
      count: records.length,
      totalVolume,
      averageDuration,
      averageChoking,
      averageInterval,
    }
  }

  const getRehabDayStats = (records: RehabRecord[]) => {
    const totals: Record<string, number> = {}
  
    rehabTypes.forEach((type) => {
      totals[type] = 0
    })
  
    records.forEach((r) => {
      totals[r.exercise_type] =
        (totals[r.exercise_type] || 0) +
        r.duration_seconds
    })
  
    return totals
  }

  const getFeedElapsed = (record: FeedRecord) => {
    const end =
      record.end_time
        ? new Date(record.end_time)
        : feedPaused && feedPausedAt
          ? feedPausedAt
          : now

    return Math.max(
      0,
      Math.floor((end.getTime() - new Date(record.start_time).getTime()) / 1000) -
        (record.paused_seconds ?? 0)
    )
  }

  const getLastChokingGap = () => {
    if (!activeFeed) return null
  
    const chokingEvents = feedEvents
      .filter(
        (e) =>
          e.record_id === activeFeed.id &&
          e.event_type === 'choking'
      )
      .sort(
        (a, b) =>
          new Date(a.event_time).getTime() -
          new Date(b.event_time).getTime()
      )
  
    if (chokingEvents.length === 0) return null
  
    const last = chokingEvents[chokingEvents.length - 1]
  
    // 현재 실제 수유 진행 시간
    const currentElapsed = getFeedElapsed(activeFeed)
  
    // 마지막 사레 발생 시점
    const lastElapsed = last.elapsed_seconds ?? 0
  
    // 직전 사레 이후 경과
    return Math.max(currentElapsed - lastElapsed, 0)
  }


  const deleteFeedRecord = async (record: FeedRecord) => {
    if (!confirm('이 수유 기록을 삭제할까요? 사레 기록도 함께 삭제됩니다.')) return
  
    await supabase.from('feed_events').delete().eq('record_id', record.id)
  
    const { error } = await supabase
      .from('feed_records')
      .delete()
      .eq('id', record.id)
  
    if (error) return alert(error.message)
  
    await loadFeedRecords()
    await loadFeedEvents()
  }


  const deleteRehabRecord = async (record: RehabRecord) => {
    if (!confirm('이 재활 기록을 삭제할까요?')) return
  
    const { error } = await supabase
      .from('rehab_records')
      .delete()
      .eq('id', record.id)
  
    if (error) return alert(error.message)
  
    await loadRehabRecords()
  }


  const getRehabColorClass = (type: string) => {
    switch (type) {
      case '터미타임':
        return 'bg-orange-500 text-white'
      case '공터미타임':
        return 'bg-green-600 text-white'
      case '뒤집기시도':
        return 'bg-blue-600 text-white'
      case '몸중심선':
        return 'bg-purple-600 text-white'
      case '구강/안면 자극':
        return 'bg-pink-600 text-white'
      case '옆 누워 놀기':
        return 'bg-teal-600 text-white'
      case '시각추적 목 회전':
        return 'bg-indigo-600 text-white'
      case '가슴 살살 두드림':
        return 'bg-amber-600 text-white'
      default:
        return 'bg-slate-800 text-slate-200'
    }
  }

  const displayRehabName = (type: string) => {
    if (type === '공터미타임') return '공 터미타임'    
    if (type === '뒤집기시도') return '뒤집기 유도'
    if (type === '뒤집기 시도') return '뒤집기 유도'
    if (type === '몸중심선') return '몸 중심선'
    if (type === '가슴 살살 두드림') return '등/가슴 두드림'
    return type
  }

  const getRehabElapsed = (record: RehabRecord) => {
    if (record.end_time) return record.duration_seconds

    const end = rehabPaused && rehabPausedAt ? rehabPausedAt : now

    return Math.max(
      0,
      Math.floor((end.getTime() - new Date(record.start_time).getTime()) / 1000) -
        rehabPausedSeconds
    )
  }

  const getFirstChokingElapsed = (record: FeedRecord) => {
    const chokingEvents = feedEvents
      .filter((e) => e.record_id === record.id && e.event_type === 'choking')
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime())

    if (chokingEvents.length === 0) return null

    const first = chokingEvents[0]

    if (first.elapsed_seconds !== null && first.elapsed_seconds !== undefined) {
      return first.elapsed_seconds
    }

    return Math.max(
      0,
      Math.floor(
        (new Date(first.event_time).getTime() - new Date(record.start_time).getTime()) / 1000
      )
    )
  }

  const getActiveChokingMessages = () => {
    if (!activeFeed) return []
  
    const formatChokingTime = (dateString: string) =>
      new Date(dateString).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
  
    const chokingEvents = feedEvents
      .filter((e) => e.record_id === activeFeed.id && e.event_type === 'choking')
      .sort(
        (a, b) =>
          new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      )
  
    if (chokingEvents.length === 0) return []
  
    const first = chokingEvents[0]
    const last = chokingEvents[chokingEvents.length - 1]
    const previous = chokingEvents[chokingEvents.length - 2]
  
    const result = [
      `수유(${formatChokingTime(activeFeed.start_time)}) 첫 사레 ${formatElapsed(first.elapsed_seconds)}`,
    ]
  
    if (previous && last) {
      const interval =
        (last.elapsed_seconds ?? 0) - (previous.elapsed_seconds ?? 0)
  
      result.push(
        `이전 사레(${formatChokingTime(previous.event_time)}) 후 ${formatElapsed(interval)}`
      )
    }
  
    return result
  }

  const lastChokingGap = getLastChokingGap()

  const handleFeedMainButton = async () => {
    if (!activeFeed) {
      await startFeeding()
      return
    }

    if (!feedPaused) {
      setFeedPaused(true)
      setFeedPausedAt(new Date())
      setMessage('수유 일시정지')
      return
    }

    if (feedPausedAt) {
      const added = Math.floor((new Date().getTime() - feedPausedAt.getTime()) / 1000)
      const newPaused = (activeFeed.paused_seconds ?? 0) + added

      const { error } = await supabase
        .from('feed_records')
        .update({ paused_seconds: newPaused })
        .eq('id', activeFeed.id)

      if (error) return alert(error.message)

      setActiveFeed({ ...activeFeed, paused_seconds: newPaused })
    }

    setFeedPaused(false)
    setFeedPausedAt(null)
    setMessage('수유 다시 시작')
  }

  const startFeeding = async () => {
    if (!userId) return alert('로그인이 필요합니다.')

    const nowTime = new Date().toISOString()

    const { data, error } = await supabase
      .from('feed_records')
      .insert({
        baby_id: BABY_ID,
        start_time: nowTime,
        end_time: null,
        created_by: userId,
        volume_ml: 0,
        choking_count: 0,
        spit_up: false,
        memo: '',
        paused_seconds: 0,
      })
      .select()
      .single()

    if (error) return alert(error.message)

    await supabase.from('feed_events').insert({
      record_id: data.id,
      baby_id: BABY_ID,
      event_type: 'start',
      event_time: nowTime,
      elapsed_seconds: 0,
      created_by: userId,
    })

    setActiveFeed(data as FeedRecord)
    setInputMode('feed')
    setFeedPaused(false)
    setFeedPausedAt(null)
    setMessage('')
    await loadFeedRecords()
    await loadFeedEvents()
  }

  const vibrate = (pattern: number | number[] = 80) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const addChoking = async () => {
    setChokingFlash(true)
    setTimeout(() => setChokingFlash(false), 300)
  
    vibrate([80, 40, 80])

    if (!userId || !activeFeed) return

    const elapsed = getFeedElapsed(activeFeed)
    const newCount = activeFeed.choking_count + 1

    const chokingEvents = feedEvents
      .filter((e) => e.record_id === activeFeed.id && e.event_type === 'choking')
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime())

    const lastChoking = chokingEvents[chokingEvents.length - 1]

    const messageText =
      lastChoking?.elapsed_seconds !== null && lastChoking?.elapsed_seconds !== undefined
        ? `이전 사레 후 ${formatElapsed(elapsed - lastChoking.elapsed_seconds)} 뒤 사레`
        : `첫 사레: 수유 시작 후 ${formatElapsed(elapsed)}`

    const { error } = await supabase
      .from('feed_records')
      .update({ choking_count: newCount })
      .eq('id', activeFeed.id)

    if (error) return alert(error.message)

    const { error: eventError } = await supabase.from('feed_events').insert({
      record_id: activeFeed.id,
      baby_id: BABY_ID,
      event_type: 'choking',
      event_time: new Date().toISOString(),
      elapsed_seconds: elapsed,
      created_by: userId,
    })

    if (eventError) return alert(eventError.message)

    setActiveFeed({ ...activeFeed, choking_count: newCount })
    setMessage(messageText)
    await loadFeedRecords()
    await loadFeedEvents()
  }

  const finishFeeding = async () => {
    if (!userId || !activeFeed) return
  
    let finalPaused = activeFeed.paused_seconds ?? 0
  
    if (feedPaused && feedPausedAt) {
      finalPaused += Math.floor((new Date().getTime() - feedPausedAt.getTime()) / 1000)
    }
  
    const endTime = new Date().toISOString()
  
    const { error } = await supabase
      .from('feed_records')
      .update({
        end_time: endTime,
        paused_seconds: finalPaused,
      })
      .eq('id', activeFeed.id)
  
    if (error) return alert(error.message)
  
    await supabase.from('feed_events').insert({
      record_id: activeFeed.id,
      baby_id: BABY_ID,
      event_type: 'end',
      event_time: endTime,
      elapsed_seconds: getFeedElapsed({ ...activeFeed, paused_seconds: finalPaused }),
      created_by: userId,
    })
  
    setEndedFeed({
      ...activeFeed,
      end_time: endTime,
      paused_seconds: finalPaused,
    })
  
    setActiveFeed(null)
    setFeedPaused(false)
    setFeedPausedAt(null)
    setMessage('수유가 종료되었습니다. 수유량과 메모를 입력 후 저장하세요.')
    await loadFeedRecords()
    await loadFeedEvents()
  }
  const cancelFeeding = async () => {
    if (!activeFeed) return
  
    if (!confirm('수유 기록을 취소할까요? 저장되지 않고 삭제됩니다.')) return
  
    await supabase.from('feed_events').delete().eq('record_id', activeFeed.id)
  
    const { error } = await supabase
      .from('feed_records')
      .delete()
      .eq('id', activeFeed.id)
  
    if (error) return alert(error.message)
  
    setActiveFeed(null)
    setEndedFeed(null)
    setFeedPaused(false)
    setFeedPausedAt(null)
    setSpitUp(false)
    setMemo('')
    setMessage('')
    setInputMode('none')
  
    await loadFeedRecords()
    await loadFeedEvents()
  }

  const saveFinishedFeed = async () => {
    if (!endedFeed) return
  
    const { error } = await supabase
      .from('feed_records')
      .update({
        volume_ml: volume,
        spit_up: spitUp,
        memo,
      })
      .eq('id', endedFeed.id)
  
    if (error) return alert(error.message)
  
    setEndedFeed(null)
    setSpitUp(false)
    setMemo('')
    setMessage('수유 기록이 저장되었습니다.')
    setInputMode('none')
  
    await loadFeedRecords()
  }


  const startRehab = async (type: string) => {
    if (!userId) return alert('로그인이 필요합니다.')

    const { data, error } = await supabase
      .from('rehab_records')
      .insert({
        baby_id: BABY_ID,
        exercise_type: type,
        start_time: new Date().toISOString(),
        end_time: null,
        duration_seconds: 0,
        memo: '',
        created_by: userId,
      })
      .select()
      .single()

    if (error) return alert(error.message)

    setActiveRehab(data as RehabRecord)
    setInputMode('rehab')
    setRehabPaused(false)
    setRehabPausedAt(null)
    setRehabPausedSeconds(0)
    setRehabMessage(`${type} 시작`)
    await loadRehabRecords()
  }

  const finishRehab = async () => {
    if (!activeRehab) return

    const elapsed = getRehabElapsed(activeRehab)

    setRecentRehabTotals((prev) => ({
      ...prev,
      [activeRehab.exercise_type]: (prev[activeRehab.exercise_type] ?? 0) + elapsed,
    }))

    const { error } = await supabase
      .from('rehab_records')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: elapsed,
      })
      .eq('id', activeRehab.id)

    if (error) return alert(error.message)

    setRehabMessage(`${activeRehab.exercise_type} 종료 · ${formatElapsed(elapsed)}`)
    setActiveRehab(null)
    setRehabPaused(false)
    setRehabPausedAt(null)
    setRehabPausedSeconds(0)
    setInputMode('none')
    await loadRehabRecords()
  }

  const cancelRehab = async () => {
    if (!activeRehab) return
  
    if (!confirm('재활 기록을 취소할까요? 저장되지 않고 삭제됩니다.')) return
  
    const { error } = await supabase
      .from('rehab_records')
      .delete()
      .eq('id', activeRehab.id)
  
    if (error) return alert(error.message)
  
    setActiveRehab(null)
    setRehabPaused(false)
    setRehabPausedAt(null)
    setRehabPausedSeconds(0)
    setRehabMessage('')
    setInputMode('none')
  
    await loadRehabRecords()
  }


  const handleRehabTypeClick = async (type: string) => {
    // 아무 재활도 진행 중이 아니면 새로 시작
    if (!activeRehab) {
      await startRehab(type)
      return
    }
  
    // 같은 재활 버튼을 다시 누르면 일시정지/재개
    if (activeRehab.exercise_type === type) {
      if (!rehabPaused) {
        setRehabPaused(true)
        setRehabPausedAt(new Date())
        setRehabMessage(`${type} 일시정지`)
        return
      }
  
      if (rehabPausedAt) {
        const added = Math.floor((new Date().getTime() - rehabPausedAt.getTime()) / 1000)
        setRehabPausedSeconds((prev) => prev + added)
      }
  
      setRehabPaused(false)
      setRehabPausedAt(null)
      setRehabMessage(`${type} 재개`)
      return
    }
  
    // 다른 재활 버튼을 누르면 기존 재활 종료 후 새 재활 시작
    const previousType = activeRehab.exercise_type
    const elapsed = getRehabElapsed(activeRehab)
  
    await supabase
      .from('rehab_records')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: elapsed,
      })
      .eq('id', activeRehab.id)
  
      setRecentRehabTotals((prev) => ({
        ...prev,
        [previousType]: (prev[previousType] ?? 0) + elapsed,
      }))
  
    await startRehab(type)
  }



  const pauseRehab = () => {
    if (!activeRehab) return
    setRehabPaused(true)
    setRehabPausedAt(new Date())
  }

  const resumeRehab = () => {
    if (!activeRehab || !rehabPausedAt) return

    const added = Math.floor((new Date().getTime() - rehabPausedAt.getTime()) / 1000)
    setRehabPausedSeconds((prev) => prev + added)
    setRehabPaused(false)
    setRehabPausedAt(null)
  }

  const todayFeedRecords = feedRecords.filter(
    (r) => new Date(r.start_time).toDateString() === new Date().toDateString() && r.end_time
  )

  const todayRehabRecords = rehabRecords.filter(
    (r) => new Date(r.start_time).toDateString() === new Date().toDateString() && r.end_time
  )

  const todayVolume = todayFeedRecords.reduce((sum, r) => sum + r.volume_ml, 0)
  const todayChoking = todayFeedRecords.reduce((sum, r) => sum + r.choking_count, 0)
  const todayRehabSeconds = todayRehabRecords.reduce((sum, r) => sum + r.duration_seconds, 0)

  const todayFeedCount = todayFeedRecords.length
  const todayAverageChoking =
    todayFeedCount > 0 ? todayChoking / todayFeedCount : 0


// 오늘 수유
const todayFeeds = feedRecords.filter(
  (r) =>
    new Date(r.start_time).toDateString() === new Date().toDateString() &&
    r.end_time
)


const lastFeed = todayFeeds[0] // 최신순 정렬 가정
const lastFeedGap = lastFeed
  ? Math.floor((new Date().getTime() - new Date(lastFeed.start_time).getTime()) / 1000)
  : null

// 오늘 재활
const todayRehabs = rehabRecords.filter(
  (r) =>
    new Date(r.start_time).toDateString() === new Date().toDateString() &&
    r.end_time
)

// 재활 활동별 누적
const todayRehabTotals = rehabTypes.reduce((acc, type) => {
  acc[type] = todayRehabs
    .filter((r) => r.exercise_type === type)
    .reduce((sum, r) => sum + r.duration_seconds, 0)
  return acc
}, {} as Record<string, number>)

// 직전 재활로부터 지난 시간
const lastRehab = todayRehabs[0]
const lastRehabGap = lastRehab
  ? Math.floor((new Date().getTime() - new Date(lastRehab.start_time).getTime()) / 1000)
  : null

  const combinedStats = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string
        totalVolume: number
        feedCount: number
        chokingCount: number
        rehabCount: number
        rehabSeconds: number
      }
    >()

    feedRecords.filter((r) => r.end_time).forEach((r) => {
      const date = new Date(r.start_time).toLocaleDateString('ko-KR')
      const item =
        map.get(date) ||
        { date, totalVolume: 0, feedCount: 0, chokingCount: 0, rehabCount: 0, rehabSeconds: 0 }

      item.totalVolume += r.volume_ml
      item.feedCount += 1
      item.chokingCount += r.choking_count
      map.set(date, item)
    })

    rehabRecords.filter((r) => r.end_time).forEach((r) => {
      const date = new Date(r.start_time).toLocaleDateString('ko-KR')
      const item =
        map.get(date) ||
        { date, totalVolume: 0, feedCount: 0, chokingCount: 0, rehabCount: 0, rehabSeconds: 0 }

      item.rehabCount += 1
      item.rehabSeconds += r.duration_seconds
      map.set(date, item)
    })

    return Array.from(map.values())
  }, [feedRecords, rehabRecords])

  const groupedFeedHistory = groupByDate(feedRecords)
  const groupedRehabHistory = groupByDate(rehabRecords)

  const downloadCSV = () => {
    const header = ['구분', '시작', '종료', '시간', '수유량', '사레', '첫 사레', '재활종류', '메모']

    const feedRows = feedRecords.map((r) => [
      '수유',
      formatDate(r.start_time),
      r.end_time ? formatDate(r.end_time) : '진행 중',
      formatElapsed(getFeedElapsed(r)),
      `${r.volume_ml}ml`,
      `${r.choking_count}회`,
      formatElapsed(getFirstChokingElapsed(r)),
      '',
      r.memo || '',
    ])

    const rehabRows = rehabRecords.map((r) => [
      '재활',
      formatDate(r.start_time),
      r.end_time ? formatDate(r.end_time) : '진행 중',
      formatElapsed(getRehabElapsed(r)),
      '',
      '',
      '',
      r.exercise_type,
      r.memo || '',
    ])

    const csv =
      '\uFEFF' +
      [header, ...feedRows, ...rehabRows]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
        .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `baby_records_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

 

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-md rounded-3xl bg-slate-900 p-6 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold">가은 수유/재활 기록 앱</h1>
          <p className="mb-6 text-sm text-slate-400">로그인 후 기록을 시작하세요.</p>

          <input
            className="mb-3 w-full rounded-xl bg-slate-800 px-4 py-3 text-white outline-none ring-1 ring-slate-700"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="mb-5 w-full rounded-xl bg-slate-800 px-4 py-3 text-white outline-none ring-1 ring-slate-700"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex flex-col items-center gap-3">
            <button onClick={login} className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold">
              로그인
            </button>
            <button onClick={signup} className="text-sm text-slate-400 underline">
              회원가입
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-24 pt-5 text-white">
      <div className="mx-auto max-w-md space-y-4">
      {tab === 'record' && inputMode === 'none' && (

        <section className="rounded-3xl bg-slate-900 p-3 shadow-xl">
          <h1 className="text-lg font-bold text-center">가은 수유/재활 기록앱</h1>
          <p className="mt-1 text-xs text-slate-400 text-center">로그인됨: {userEmail}</p>
        </section>
      )}
      
        {tab === 'record' && (
          <>
                      {inputMode === 'none' && (
            <section className="rounded-3xl bg-slate-900 p-1 shadow-xl">
              <h2 className="mb-5 text-sm font-bold text-center">기록 선택</h2>

              <div className="flex flex-col gap-4">
                
              <button
                onClick={startFeeding}
                className="w-full rounded-3xl bg-orange-500 py-10 text-5xl font-bold shadow-lg active:scale-95"
              >
                수유 시작
              </button>

                <button
                  onClick={() => setInputMode('rehab')}
                  className="w-full rounded-3xl bg-green-600 py-10 text-5xl font-bold shadow-lg active:scale-95"
                >
                  재활 시작
                </button>

              </div>
            </section>
          )}

 {tab === 'record' && inputMode === 'none' && (
                  <section className="rounded-3xl bg-slate-900 py-2 shadow-xl">
                <h2 className="mb-2 text-sm font-bold text-center">오늘 통계</h2>


  <div className="space-y-2">

    {/* 수유 */}
    <div className="rounded-2xl bg-slate-800 p-3">

  <div className="grid grid-cols-2 gap-3 text-center">
    <div>
      <p className="text-xs text-slate-400">수유량</p>
      <p className="text-lg font-bold">{todayVolume} ml</p>
    </div>

    <div>
      <p className="text-xs text-slate-400">수유 횟수</p>
      <p className="text-lg font-bold">{todayFeedCount}회</p>
    </div>

    <div>
      <p className="text-xs text-slate-400">평균 사레 횟수</p>
      <p className="text-lg font-bold">
        {todayAverageChoking.toFixed(1)}회
      </p>
    </div>

    <div>
      <p className="text-xs text-slate-400">직전 수유 후</p>
      <p className="text-lg font-bold">
        {formatElapsedHM(lastFeedGap)}
      </p>
    </div>
  </div>
</div>

    {/* 재활 */}
    <div className="mb-3 flex items-center justify-between">
  <p className="text-sm font-bold text-slate-300">재활</p>

  <div className="text-right">
    <p className="text-xs text-slate-400">총 시간</p>
    <p className="text-sm font-extrabold text-green-400">
      {formatElapsed(todayRehabSeconds)}
    </p>
  </div>
</div>

<div className="space-y-2">
  {rehabTypes.map((type) => {
    const seconds = todayRehabTotals[type] ?? 0
    const hasRecord = seconds > 0

    return (
      <div key={type} className="flex justify-between text-sm">
        <span className={hasRecord ? 'font-extrabold text-green-400' : 'text-slate-500'}>
        {displayRehabName(type)}
        </span>

        <span className={hasRecord ? 'font-extrabold text-green-400' : 'text-slate-500'}>
          {formatElapsed(seconds)}
        </span>
      </div>
    )
  })}
</div>
      <div className="mt-3 text-right text-sm font-extrabold">
        마지막 재활 후 {formatElapsedHM(lastRehabGap)}
      </div>
  </div>


</section>
 )}

{inputMode === 'feed' && (
  <section className="rounded-3xl bg-slate-900 p-5 shadow-xl">
    <h2 className="mb-2 text-lg font-bold">수유 입력</h2>

    {activeFeed && (
      <>
<button
  onClick={handleFeedMainButton}
  className={`w-full rounded-3xl p-3 text-center ${
    feedPaused ? 'bg-slate-500' : 'bg-green-600'
  }`}
>
      <p className="text-sm opacity-90">
        수유 시작
        {activeFeed && (
          <span className="ml-1">
            (
            {new Date(activeFeed.start_time).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
            )
          </span>
        )}
      </p>

  <p className="mt-3 text-3xl font-extrabold">
    {formatElapsed(getFeedElapsed(activeFeed))}
  </p>

  <p className="mt-3 text-lg">
    {feedPaused ? '일시정지 중' : '시간 측정 중'}
  </p>
</button>

<button
  onClick={addChoking}
  className={`mt-3 w-full rounded-3xl bg-red-600 py-4 text-center transition-all duration-300 ${
    chokingFlash ? 'scale-105 ring-4 ring-yellow-300 bg-yellow-500 text-black' : ''
  }`}
>
  <div className="text-3xl font-extrabold">
    사레 발생
  </div>

  <div className="mt-2 text-2xl font-extrabold">
    (총 {activeFeed.choking_count}회)
  </div>
  
  {lastChokingGap !== null && (
  <div className="mt-2 rounded-2xl bg-red-700/40 p-2">
    <p className="text-sm text-red-200">
      직전 사레 후
    </p>

    <p className="mt-1 text-2xl font-extrabold text-white">
      {formatElapsed(lastChokingGap)}
    </p>
  </div>
)}
</button>
      
      
        {/* 상태 메시지 + 사레 이력 */}
<div className="mt-3 space-y-2">
 

  {/* 2. 첫 사레 / 이전 사레 */}
  {getActiveChokingMessages().length > 0 && (
  <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-200 space-y-1">
    {getActiveChokingMessages().map((text, index) => (
      <p key={index}>{text}</p>
    ))}
  </div>
)}
</div>
    
<div className="mt-4">
  <button
    onClick={finishFeeding}
    className="w-full rounded-2xl bg-slate-100 py-4 font-bold text-slate-950"
  >
    수유 종료 및 저장
  </button>

  <button
    onClick={cancelFeeding}
    className="mt-9 w-full rounded-2xl border border-red-500 bg-transparent py-3 font-bold text-red-400"
  >
    수유 취소
  </button>
</div>

      </>
    )}

    {endedFeed && (
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-800 p-4">
          <p className="text-sm text-slate-400">최종 수유시간</p>
          <p className="text-3xl font-extrabold">
            {formatElapsed(getFeedElapsed(endedFeed))}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            총 사레횟수
            </p>
            <p className="text-3xl font-extrabold">  
             {endedFeed.choking_count}회
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold">수유량 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {[100, 120, 140, 160, 180, 200].map((v) => (
              <button
                key={v}
                onClick={() => setVolume(v)}
                className={`rounded-2xl py-3 font-bold ${
                  volume === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {v} ml
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-3">
          <button
            onClick={() => setVolume(Math.max(0, volume - 10))}
            className="rounded-xl bg-slate-700 px-5 py-3"
          >
            -10
          </button>

          <p className="text-xl font-bold">{volume} ml</p>

          <button
            onClick={() => setVolume(volume + 10)}
            className="rounded-xl bg-slate-700 px-5 py-3"
          >
            +10
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-800 p-4">
          <input
            type="checkbox"
            checked={spitUp}
            onChange={(e) => setSpitUp(e.target.checked)}
            className="h-5 w-5"
          />
          게우기 있었음
        </label>

        <textarea
          className="w-full rounded-2xl bg-slate-800 p-4 text-white outline-none ring-1 ring-slate-700"
          placeholder="메모"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
        />

        <button
          onClick={saveFinishedFeed}
          className="w-full rounded-2xl bg-green-600 py-4 text-lg font-bold"
        >
          수유 기록 저장
        </button>
      </div>
    )}
  </section>
)}



            {inputMode === 'rehab' && (
              <section className="rounded-3xl bg-slate-900 p-5 shadow-xl">
                 <div className="flex justify-between items-center mb-4">
                 
                  <h2 className="text-lg font-bold">재활 입력</h2>

                  {!activeRehab && (
                    <button
                      onClick={() => {
                        if (confirm('재활 입력을 취소하고 돌아가시겠습니까?')) {
                          setInputMode('none')
                        }
                      }}
                      className="text-sm text-slate-400 underline"
                    >
                      취소
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
  {rehabTypes.map((type) => (
    <button
      key={type}
      onClick={() => handleRehabTypeClick(type)}
      className={`rounded-3xl py-4 text-lg font-extrabold shadow-lg active:scale-95 ${
        activeRehab?.exercise_type === type
          ? 'bg-green-600 text-white'
          : 'bg-slate-800 text-slate-200'
      }`}
    >
      {type}
    </button>
  ))}
</div>

              {activeRehab && (
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => {
                      if (!rehabPaused) {
                        pauseRehab()
                      } else {
                        resumeRehab()
                      }
                    }}
                    className={`w-full rounded-2xl py4 text-center ${
                      rehabPaused ? 'bg-blue-600' : 'bg-green-600'
                    }`}
                  >
                    <p className="text-sm opacity-90">{activeRehab.exercise_type}</p>
                    <p className="mt-2 text-4xl font-extrabold">
                      {formatElapsed(getRehabElapsed(activeRehab))}
                    </p>
                    <p className="mt-2 text-sm">
                      {rehabPaused ? '일시정지 중' : '시간 측정 중'}
                    </p>
                  </button>

      
          <div className="mt-4 rounded-2xl bg-slate-800 p-4">
  <p className="mb-3 text-sm font-bold text-slate-300">
    재활 누적 시간
  </p>

  <div className="space-y-2">
    {rehabTypes.map((type) => (
      <div
        key={type}
        className="flex justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm"
      >
        <span className="text-slate-300">{type}</span>
        <span className="font-bold text-white">
          {formatElapsed(recentRehabTotals[type] ?? 0)}
        </span>
      </div>
    ))}
            </div>
          </div>
        
                  <button
                    onClick={finishRehab}
                    className="w-full rounded-3xl bg-slate-100 py-5 text-xl font-extrabold text-slate-950 shadow-lg active:scale-95"
                  >
                    재활종료 및 저장
                  </button>

                  <button
                    onClick={cancelRehab}
                    className="w-full rounded-3xl bg-slate-700 py-5 text-xl font-extrabold text-slate-200 shadow-lg active:scale-95"
                  >
                    재활 취소
                  </button>
                </div>
              )}
                
              </section>
            )}
          </>
        )}

{tab === 'history' && (
  <section className="rounded-3xl bg-slate-900 p-4 shadow-xl">
    <h2 className="mb-4 text-lg font-bold">이력</h2>

    <div className="mb-4 grid grid-cols-2 gap-2">
      <button
        onClick={() => setHistoryType('feed')}
        className={`rounded-2xl py-3 font-bold ${
          historyType === 'feed' ? 'bg-blue-600' : 'bg-slate-800'
        }`}
      >
        수유 이력
      </button>

      <button
        onClick={() => setHistoryType('rehab')}
        className={`rounded-2xl py-3 font-bold ${
          historyType === 'rehab' ? 'bg-green-600' : 'bg-slate-800'
        }`}
      >
        재활 이력
      </button>
    </div>

    {historyType === 'feed' && (
      <div className="space-y-5">
        {Object.entries(groupedFeedHistory).map(([date, items]) => (
          <div key={date} className="rounded-2xl bg-slate-800 p-3">
            
              <div className="mb-2 rounded-xl bg-slate-950 px-3 py-2">
              <div className="text-center text-sm font-bold text-slate-300">
                {date}
              </div>

              {(() => {
                const stats = getFeedDayStats(items as FeedRecord[])

                return (
                  <div className="mt-1 text-center text-[10px] leading-5 font-bold">
                    수유 {stats.count}회/ 평균 {formatElapsed(stats.averageDuration)} / 총 {stats.totalVolume}ml
                    <br />
                    평균 사레 {stats.averageChoking.toFixed(1)}회/ 평균 간격{' '}
                    {stats.averageInterval > 0 ? formatElapsed(stats.averageInterval) : '-'}
                  </div>
                )
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-2">시각</th>
                    <th className="px-2">수유시간</th>
                    <th className="px-2">수유량</th>
                    <th className="px-2">사레</th>
                    <th className="px-2">첫 사레</th>
                    <th className="px-2">게우기</th>
                    <th className="px-2">메모</th>
                    <th className="px-2">관리</th>
                  </tr>
                </thead>

                <tbody>
                  {(items as FeedRecord[]).map((r) => (
                    <tr key={r.id} className="border-t border-slate-700">
                      <td className="p-2 font-bold">
                        {formatTimeOnly(r.start_time)}
                      </td>
                      <td className="p-2">{formatElapsed(getFeedElapsed(r))}</td>
                      <td className="p-2">{r.volume_ml} ml</td>
                      <td className="p-2">{r.choking_count}회</td>
                      <td className="p-2">
                        {formatElapsed(getFirstChokingElapsed(r))}
                      </td>
                      <td className="p-2">{r.spit_up ? '예' : '아니오'}</td>
                      <td className="p-2">{r.memo || '-'}</td>
                      <td className="p-2">
                        <button
                          onClick={() => deleteFeedRecord(r)}
                          className="text-red-400 font-bold"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )}

    {historyType === 'rehab' && (
      <div className="space-y-3">
        {Object.entries(groupedRehabHistory).map(([date, items]) => (
          <div key={date} className="rounded-2xl bg-slate-800 p-3">
                    <div className="mb-2 rounded-xl bg-slate-950 px-3 py-2">
          <div className="text-center text-sm font-bold text-slate-300">
            {date}
          </div>

          {(() => {
            const stats = getRehabDayStats(items as RehabRecord[])

            const lines = rehabTypes
              .filter((type) => stats[type] > 0)
              .map(
                (type) =>
                  `${displayRehabName(type)} ${formatElapsed(stats[type])}`
              )

            return (
              <div className="mt-1 text-center text-[10px] leading-5 ">
                {lines.length > 0 ? lines.join('/ ') : '기록 없음'}
              </div>
            )
          })()}
        </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-2">시각</th>
                    <th className="px-2">재활 종류</th>
                    <th className="px-2">운동 시간</th>
                    <th className="px-2">메모</th>
                    <th className="px-2">관리</th>
                  </tr>
                </thead>

                <tbody>
                  {(items as RehabRecord[]).map((r) => (
                    <tr key={r.id} className="border-t border-slate-700">
                      <td className="p-2 font-bold">
                        {formatTimeOnly(r.start_time)}
                      </td>
                      <td className="p-2">{r.exercise_type}</td>
                      <td className="p-2">{formatElapsed(r.duration_seconds)}</td>
                      <td className="p-2">{r.memo || '-'}</td>
                      <td className="p-2">
                        <button
                          onClick={() => deleteRehabRecord(r)}
                          className="text-red-400 font-bold"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}

        {tab === 'stats' && (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-blue-600 p-4">
                <p className="text-xs opacity-80">오늘 수유량</p>
                <p className="text-xl font-bold">{todayVolume} ml</p>
              </div>
              <div className="rounded-2xl bg-red-600 p-4">
                <p className="text-xs opacity-80">오늘 사레</p>
                <p className="text-xl font-bold">{todayChoking}회</p>
              </div>
              <div className="rounded-2xl bg-green-600 p-4">
                <p className="text-xs opacity-80">오늘 재활</p>
                <p className="text-xl font-bold">{formatElapsed(todayRehabSeconds)}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-5 shadow-xl">
              <h2 className="mb-4 text-lg font-bold">수유 + 재활 통합 통계</h2>
              <div className="space-y-4">
                {combinedStats.map((d) => (
                  <div key={d.date} className="rounded-2xl bg-slate-800 p-4">
                    <p className="mb-2 font-bold">{d.date}</p>
                    <p className="text-sm text-slate-300">수유 {d.feedCount}회 · 총 {d.totalVolume}ml</p>
                    <p className="text-sm text-slate-300">사레 {d.chokingCount}회</p>
                    <p className="text-sm text-slate-300">재활 {d.rehabCount}회 · {formatElapsed(d.rehabSeconds)}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={downloadCSV} className="w-full rounded-2xl bg-slate-800 py-4 font-bold">
              CSV 다운로드
            </button>

            <button onClick={logout} className="w-full rounded-2xl bg-slate-700 py-4 font-bold">
              로그아웃
            </button>
          </section>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950 px-4 py-3">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button onClick={() => setTab('record')} className={`rounded-2xl py-3 font-bold ${tab === 'record' ? 'bg-blue-600' : 'bg-slate-800'}`}>
            기록
          </button>
          <button onClick={() => setTab('history')} className={`rounded-2xl py-3 font-bold ${tab === 'history' ? 'bg-blue-600' : 'bg-slate-800'}`}>
            이력
          </button>
          <button onClick={() => setTab('stats')} className={`rounded-2xl py-3 font-bold ${tab === 'stats' ? 'bg-blue-600' : 'bg-slate-800'}`}>
            통계
          </button>
        </div>
      </nav>
    </main>
  )
}