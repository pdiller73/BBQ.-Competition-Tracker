import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth/AuthContext'
import AuthScreen from './auth/AuthScreen'
import App from './App'
import { loadUserData, saveCompetition, deleteCompetition, saveRecipe, deleteRecipe, saveSettings } from './lib/data'

export default function Root() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [appState, setAppState]   = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState(null)

  // Load user's data from Supabase when they log in
  useEffect(() => {
    if (!user) {
      setAppState(null)
      return
    }
    setDataLoading(true)
    setDataError(null)
    loadUserData(user.id)
      .then(data => {
        setAppState(data)
        setDataLoading(false)
      })
      .catch(err => {
        setDataError(err.message)
        setDataLoading(false)
      })
  }, [user])

  // ── Handlers passed down to App ─────────────────────────────

  const handleSaveComp = useCallback(async (comp) => {
    if (!user) return
    const { data, error } = await saveCompetition(user.id, comp)
    if (error) { console.error('Save comp error:', error); return }
    setAppState(prev => {
      const id = data?.id || comp.id
      const updated = { ...comp, id }
      const existing = prev.competitions.findIndex(c => c.id === comp.id)
      const competitions = existing >= 0
        ? prev.competitions.map(c => c.id === comp.id ? updated : c)
        : [updated, ...prev.competitions]
      return { ...prev, competitions }
    })
  }, [user])

  const handleDeleteComp = useCallback(async (compId) => {
    if (!user) return
    const { error } = await deleteCompetition(user.id, compId)
    if (error) { console.error('Delete comp error:', error); return }
    setAppState(prev => ({
      ...prev,
      competitions: prev.competitions.filter(c => c.id !== compId)
    }))
  }, [user])

  const handleSaveRecipe = useCallback(async (recipe) => {
    if (!user) return
    const { data, error } = await saveRecipe(user.id, recipe)
    if (error) { console.error('Save recipe error:', error); return }
    setAppState(prev => {
      const id = data?.id || recipe.id
      const updated = { ...recipe, id }
      const existing = prev.recipes.findIndex(r => r.id === recipe.id)
      const recipes = existing >= 0
        ? prev.recipes.map(r => r.id === recipe.id ? updated : r)
        : [updated, ...prev.recipes]
      return { ...prev, recipes }
    })
  }, [user])

  const handleDeleteRecipe = useCallback(async (recipeId) => {
    if (!user) return
    const { error } = await deleteRecipe(user.id, recipeId)
    if (error) { console.error('Delete recipe error:', error); return }
    setAppState(prev => ({
      ...prev,
      recipes: prev.recipes.filter(r => r.id !== recipeId)
    }))
  }, [user])

  const handleUpdateSettings = useCallback(async (patch) => {
    if (!user) return
    const newSettings = { ...appState, ...patch }
    setAppState(newSettings)
    if (patch.competitionType) {
      await saveSettings(user.id, { competitionType: patch.competitionType })
    }
  }, [user, appState])

  // ── Render ──────────────────────────────────────────────────

  // Still checking auth
  if (authLoading) {
    return <LoadingScreen message="Starting up..." />
  }

  // Not logged in
  if (!user) {
    return <AuthScreen />
  }

  // Logged in but loading data
  if (dataLoading) {
    return <LoadingScreen message="Loading your data..." />
  }

  // Data error
  if (dataError) {
    return (
      <ErrorScreen
        message={dataError}
        onRetry={() => {
          setDataLoading(true)
          loadUserData(user.id).then(data => {
            setAppState(data)
            setDataLoading(false)
          }).catch(err => {
            setDataError(err.message)
            setDataLoading(false)
          })
        }}
        onSignOut={signOut}
      />
    )
  }

  // All good — show the app
  return (
    <App
      user={user}
      initialState={appState}
      onSaveComp={handleSaveComp}
      onDeleteComp={handleDeleteComp}
      onSaveRecipe={handleSaveRecipe}
      onDeleteRecipe={handleDeleteRecipe}
      onUpdateSettings={handleUpdateSettings}
      onSignOut={signOut}
    />
  )
}

function LoadingScreen({ message }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0A05',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: "'Barlow', sans-serif",
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 24,
        color: '#FF8C00',
        letterSpacing: 2,
      }}>Competition Pro</div>
      <div style={{ color: '#8B7355', fontSize: 14 }}>{message}</div>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #3D2410',
        borderTopColor: '#FF8C00',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorScreen({ message, onRetry, onSignOut }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0A05',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 24,
      fontFamily: "'Barlow', sans-serif",
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#FF4D00', letterSpacing: 2 }}>
        Something went wrong
      </div>
      <div style={{ color: '#8B7355', fontSize: 13, maxWidth: 400 }}>{message}</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={onRetry} style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, #FF4D00, #FF8C00)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 1,
          cursor: 'pointer',
        }}>Try Again</button>
        <button onClick={onSignOut} style={{
          padding: '10px 24px',
          background: 'transparent',
          border: '1px solid #3D2410',
          borderRadius: 8,
          color: '#8B7355',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 15,
          cursor: 'pointer',
        }}>Sign Out</button>
      </div>
    </div>
  )
}
